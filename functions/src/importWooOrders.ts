/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-constant-condition */
/* eslint-disable require-jsdoc */
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { firestore } from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/https";

const LICENSE_PRODUCT_IDS = ["6929", "7768"];
const WOO_BASE_URL = defineSecret("WOO_BASE_URL");
const WOO_CONSUMER_KEY = defineSecret("WOO_CONSUMER_KEY");
const WOO_CONSUMER_SECRET = defineSecret("WOO_CONSUMER_SECRET");

// Scheduled to run daily at midnight UTC
export const importWooOrdersDaily = onSchedule(
    {
        schedule: "0 1 * * *",
        timeZone: "America/Phoenix",
        secrets: [WOO_BASE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET],
    },
    async () => {
        logger.log("🚀 Scheduled WooCommerce Order Sync started...");

        const db = firestore();

        const fetchWooIndexedOrderIds = async (): Promise<Set<string>> => {
            const snapshot = await db.collection("website_orders_indexes").get();
            const idSet = new Set<string>();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (Array.isArray(data.orderIds)) {
                    data.orderIds.forEach((id: string) => idSet.add(id));
                }
            });
            return idSet;
        };

        const fetchWooCommerceOrders = async () => {
            let orders: any[] = [];
            let page = 1;
            const perPage = 100;
            const dateAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            while (true) {
                const baseUrl = WOO_BASE_URL.value() + "/orders";
                const params = new URLSearchParams({
                    per_page: perPage.toString(),
                    page: page.toString(),
                    consumer_key: WOO_CONSUMER_KEY.value(),
                    consumer_secret: WOO_CONSUMER_SECRET.value(),
                    after: dateAfter,
                });

                const res = await fetch(`${baseUrl}?${params.toString()}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
                const data = await res.json();

                if (!data.length) break;
                orders = [...orders, ...data];
                page++;
            }

            return orders;
        };

        try {
            const rawOrders = await fetchWooCommerceOrders();
            const dateAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            console.log(`📦 Fetched ${rawOrders.length} orders after ${dateAfter} (UTC)`);

            const existingIds = await fetchWooIndexedOrderIds();
            const newOrderIds: string[] = [];

            const newOrders = rawOrders.map(WooOrder.fromApi).filter((order) => {
                if (!existingIds.has(order.id)) {
                    newOrderIds.push(order.id);
                    return true;
                }
                return false;
            });

            console.log(`🆕 New unique orders to add: ${newOrders.length}`);

            for (const order of newOrders) {
                const containsLicense = order.products.some((p) =>
                    p.productId && LICENSE_PRODUCT_IDS.includes(p.productId)
                );

                const cleanOrder = Object.fromEntries(
                    Object.entries(order).filter(([_, value]) => value !== undefined)
                );

                const docData: Record<string, any> = {
                    ...cleanOrder,
                    importedAt: Date.now(),
                    ...(containsLicense ? { licenseDelivered: false } : {}),
                };

                await db.collection("website_orders").doc(order.id).set(docData);
            }

            if (newOrderIds.length > 0) {
                const snapshot = await db.collection("website_orders_indexes").get();
                const currentIndexes = snapshot.docs.map((doc) => doc.id)
                    .filter((id) => id.startsWith("index_"))
                    .map((id) => parseInt(id.split("_")[1]))
                    .sort((a, b) => a - b);

                const lastIndex = currentIndexes.at(-1) ?? -1;
                const chunkSize = 50000;
                const chunks = [];

                for (let i = 0; i < newOrderIds.length; i += chunkSize) {
                    chunks.push(newOrderIds.slice(i, i + chunkSize));
                }

                for (let i = 0; i < chunks.length; i++) {
                    await db.collection("website_orders_indexes")
                        .doc(`index_${lastIndex + 1 + i}`)
                        .set({
                            orderIds: chunks[i],
                            createdAt: Date.now(),
                        });
                }

                console.log("✅ Index updated.");
            }

            console.log("🎉 WooCommerce sync completed.");
        } catch (err) {
            console.error("❌ Failed to import WooCommerce orders:", err);
        }
    }
);

export const refreshWooOrders = onRequest(
    {
        secrets: [WOO_BASE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET],
        timeoutSeconds: 540,
    },
    async (req, res) => {
        const db = firestore();
        const existingSnapshot = await db.collection("website_orders").get();
        const existingIds = new Set(existingSnapshot.docs.map((doc) => doc.id));
        console.log(`🔁 Found ${existingIds.size} existing Firebase orders.`);

        const allWooOrders: any[] = [];
        let page = 1;
        const perPage = 100;

        while (page <= 18) {
            const url = `${WOO_BASE_URL.value()}/orders?per_page=${perPage}&page=${page}&consumer_key=${WOO_CONSUMER_KEY.value()}&consumer_secret=${WOO_CONSUMER_SECRET.value()}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`❌ Failed to fetch page ${page} from WooCommerce`);
                break;
            }

            const data = await response.json();
            if (data.length === 0) break;

            allWooOrders.push(...data);
            page++;
        }

        console.log(`📦 Fetched ${allWooOrders.length} Woo orders from API.`);

        const updatedOrders: string[] = [];
        console.log("Existing IDs:", Array.from(existingIds));

        for (const wooOrder of allWooOrders) {
            const orderId = wooOrder.id.toString();

            // Skip if not in Firebase
            if (!existingIds.has(orderId)) continue;

            try {
                const docRef = db.collection("website_orders").doc(orderId);
                const doc = await docRef.get();

                // Skip if 'currency' is already set
                if (doc.exists && doc.data()?.currency) {
                    console.log(`⏩ Skipping ${orderId}, currency already exists.`);
                    continue;
                }

                const updatedOrder = WooOrder.fromApi(wooOrder);
                const cleanOrder = Object.fromEntries(
                    Object.entries(updatedOrder).filter(([_, value]) => value !== undefined)
                );

                await docRef.update(cleanOrder);
                console.log(`✅ Updated order ${orderId} in Firebase:`, cleanOrder);
                updatedOrders.push(orderId);
            } catch (err) {
                console.error(`❌ Error updating order ${orderId}:`, err);
            }
        }


        console.log(`✅ Updated ${updatedOrders.length} existing Woo orders`);
        res.send(`✅ Updated ${updatedOrders.length} existing Woo orders`);
    }
);


type WooOrderProduct = {
    productId: string
    productName: string
    sku: string
    quantity: number
}

class WooOrder {
    id: string;
    date: number;
    customer: string;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    status: number;
    paymentMethod: string;
    paymentIdentifier: string;
    totalAmount: number;
    currency: string;
    products: WooOrderProduct[];
    hasLicense: boolean;
    licenseDelivered?: boolean;

    ipAddress?: string; // 🌍 For geolocation
    userAgent?: string; // 🖥️ User agent
    grossTotal?: number; // 💰 If available separately
    fee?: number; // 💸 Calculated
    netTotal?: number; // 🧾 Calculated

    constructor(data: Partial<WooOrder>) {
        this.id = data.id || "";
        this.date = data.date || 0;
        this.customer = data.customer || "";
        this.customerFirstName = data.customerFirstName || "";
        this.customerLastName = data.customerLastName || "";
        this.customerEmail = data.customerEmail || "";
        this.status = data.status ?? 2;
        this.paymentMethod = data.paymentMethod || "";
        this.paymentIdentifier = data.paymentIdentifier || "";
        this.totalAmount = data.totalAmount || 0;
        this.currency = data.currency || "USD";
        this.products = data.products || [];
        this.hasLicense = data.hasLicense ?? false;
        this.licenseDelivered = data.hasLicense && data.licenseDelivered !== undefined ?
            data.licenseDelivered :
            undefined;

        this.ipAddress = data.ipAddress;
        this.userAgent = data.userAgent;

        // 💸 Optional fee calculation
        this.fee = this.totalAmount > 0 ? this.totalAmount * 0.029 + 0.3 : 0;
        this.netTotal = this.totalAmount - (this.fee || 0);
    }

    static fromApi(data: any): WooOrder {
        const lineItems = data.line_items || [];
        const licenseSKUs = ["CL001", "CL002"];

        const hasLicense = lineItems.some((item: any) =>
            licenseSKUs.includes(item.sku?.toUpperCase())
        );

        return new WooOrder({
            id: data.id.toString(),
            date: new Date(data.date_created).getTime(),
            customer: `${data.billing.first_name} ${data.billing.last_name}`,
            customerFirstName: data.billing.first_name,
            customerLastName: data.billing.last_name,
            customerEmail: data.billing.email,
            status: data.status === "processing" ? 1 : data.status === "completed" ? 0 : 2,
            paymentMethod: data.payment_method_title,
            paymentIdentifier: data.order_key,
            totalAmount: parseFloat(data.total),
            currency: data.currency || "USD",
            products: lineItems.map((item: any) => ({
                productId: item.product_id.toString(),
                productName: item.name,
                sku: item.sku || "N/A",
                quantity: item.quantity,
            })),
            hasLicense: hasLicense,
            ...(hasLicense ? { licenseDelivered: false } : {}),
            ipAddress: data.customer_ip_address || "",
            userAgent: data.customer_user_agent || "",
        });
    }
}

