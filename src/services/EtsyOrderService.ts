import { collection, query, where, getDocs, orderBy, limit, startAfter, Query, getDoc, doc, DocumentData } from "firebase/firestore";
import { db } from "@/firebase"; // Adjust the import if needed
import { TableQueries } from "@/@types/common";
import { EtsyOrder } from "@/@types/etsy_order";
import { Product } from "@/@types/product";
import { EtsyReview } from "@/@types/etsy_review";
import { EtsyReviewFilterQueries } from "@/views/etsy/Reviews/store/etsyReviewsSlice";

export async function apiGetFollowupEtsyOrders<T, U extends TableQueries>(params: U) {
    try {
        const ordersRef = collection(db, "etsy_orders");
        const reviewsRef = collection(db, "etsy_reviews");

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const tenDaysAgo = new Date(now);
        tenDaysAgo.setDate(now.getDate() - 10);
        const tenDaysAgoTimestamp = tenDaysAgo.getTime();

        const fourDaysAgo = new Date(now);
        fourDaysAgo.setDate(now.getDate() - 4);
        const fourDaysAgoTimestamp = fourDaysAgo.getTime() + 86400000;

        console.log("🔍 Fetching orders from:", tenDaysAgo.toDateString(), "to", fourDaysAgo.toDateString());
        console.log("🔍 Fetching orders from:", tenDaysAgoTimestamp, "to", fourDaysAgoTimestamp);

        const pageSize = params.pageSize || 50;
        let pageIndex = params.pageIndex = params.pageIndex || 0;
        const skipCount = (pageIndex - 1) * pageSize;
        console.log(pageIndex, pageSize, skipCount);

        if (pageIndex > 0) {
            pageIndex = params.pageIndex - 1;
        }

        console.log(pageIndex, pageSize, skipCount);
        const countQuery = query(
            ordersRef,
            where("orderDetails.saleDate", ">=", tenDaysAgoTimestamp),
            where("orderDetails.saleDate", "<", fourDaysAgoTimestamp),
            where("isFollowupDone", "==", false)
        );
        const countSnapshot = await getDocs(countQuery);
        const totalOrders = countSnapshot.size;

        console.log("📦 Total matching orders:", totalOrders);

        let baseQuery: Query = query(
            ordersRef,
            where("orderDetails.saleDate", ">=", tenDaysAgoTimestamp),
            where("orderDetails.saleDate", "<", fourDaysAgoTimestamp),
            where("isFollowupDone", "==", false),
            orderBy("orderDetails.saleDate", "desc"),
            limit(pageSize)
        );

        // If skipping, fetch up to the start of this page, then continue from there
        if (skipCount > 0) {
            const skipQuery = query(
                ordersRef,
                where("orderDetails.saleDate", ">=", tenDaysAgoTimestamp),
                where("orderDetails.saleDate", "<", fourDaysAgoTimestamp),
                where("isFollowupDone", "==", false),
                orderBy("orderDetails.saleDate", "desc"),
                limit(skipCount)
            );

            const skipSnapshot = await getDocs(skipQuery);
            const lastVisible = skipSnapshot.docs[skipSnapshot.docs.length - 1];

            baseQuery = query(baseQuery, startAfter(lastVisible));
        }

        const querySnapshot = await getDocs(baseQuery);

        // ✅ Map Firestore data to `EtsyOrder` type
        const orders: EtsyOrder[] = await Promise.all(querySnapshot.docs.map(async (doc) => {
            const data = doc.data() as EtsyOrder;

            // ✅ Extract first and last name from full name
            const [firstnameRaw, ...lastnamePartsRaw] = (data.buyer.name || "").split(" ")

            const capitalize = (str: string) =>
                str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

            const firstname = capitalize(firstnameRaw)
            const lastname = lastnamePartsRaw.map(capitalize).join(" ")

            const orderWithBuyerData: EtsyOrder = {
                ...data,
                orderId: doc.id,
                buyer: {
                    ...data.buyer,
                    firstname: firstname || "",
                    lastname: lastname || "",
                },
                isRepeatOrder: false, // Default value, will update after checking Firestore
                review: null, // Will be updated below
            };

            // ✅ Check if buyer has multiple orders
            if (data.buyer.username && data.buyer.username != "Unknown") {
                const repeatOrdersQuery = query(ordersRef, where("buyer.username", "==", data.buyer.username));
                const repeatOrdersSnapshot = await getDocs(repeatOrdersQuery);
                orderWithBuyerData.isRepeatOrder = repeatOrdersSnapshot.size > 1; // If more than 1 order, it's a repeat buyer
            }

            // ✅ Fetch review for this order
            const reviewQuery = query(reviewsRef, where("orderId", "==", doc.id));
            const reviewSnapshot = await getDocs(reviewQuery);

            if (!reviewSnapshot.empty) {
                orderWithBuyerData.review = reviewSnapshot.docs[0].data() as EtsyReview;
            }

            return orderWithBuyerData;
        }));

        console.log("📦 Final Orders with Reviews & Repeat Buyer Status:", orders);

        return {
            data: orders,
            total: totalOrders, // Consider fetching total count separately if needed
        };
    } catch (error) {
        console.error("❌ Error fetching follow-up orders:", error);
        throw new Error("Failed to fetch follow-up orders.");
    }
}

// 📦 Fetch Etsy orders for the same customer using an orderId
export async function apiGetCustomerRelatedEtsyOrders(referenceOrderId: string): Promise<EtsyOrder[]> {
    try {
        const ordersRef = collection(db, "etsy_orders");
        const itemsRef = collection(db, "etsy_orders_items");
        const reviewsRef = collection(db, "etsy_reviews");
        const productsRef = collection(db, "products");

        // Step 1: Get reference order
        const orderDoc = await getDoc(doc(ordersRef, referenceOrderId));
        if (!orderDoc.exists()) throw new Error("Reference order not found");

        const currentOrder = orderDoc.data();
        const customerUsername = currentOrder.buyer?.username || "";
        if (!customerUsername) throw new Error("Customer username missing");

        // Step 2: Get all orders from this customer
        const customerOrdersQuery = query(ordersRef, where("buyer.username", "==", customerUsername));
        const customerOrdersSnapshot = await getDocs(customerOrdersQuery);
        const orderIds = customerOrdersSnapshot.docs.map(doc => doc.id);
        if (orderIds.length === 0) return [];

        // Step 3: Batch fetch order items
        const orderItemDocs: any[] = [];
        for (let i = 0; i < orderIds.length; i += 10) {
            const batchIds = orderIds.slice(i, i + 10);
            const itemsQuery = query(itemsRef, where("orderId", "in", batchIds));
            const itemsSnapshot = await getDocs(itemsQuery);
            orderItemDocs.push(...itemsSnapshot.docs.map(doc => doc.data()));
        }

        // Step 4: Extract all unique SKUs
        const allSkus = Array.from(new Set(orderItemDocs.map(item => item.sku?.trim()).filter(Boolean)));

        // Step 5: Batch fetch products by SKU
        const skuMap: Record<string, Product> = {};
        for (let i = 0; i < allSkus.length; i += 10) {
            const batchSkus = allSkus.slice(i, i + 10);
            const skuQuery = query(productsRef, where("sku", "in", batchSkus));
            const skuSnapshot = await getDocs(skuQuery);
            skuSnapshot.docs.forEach(doc => {
                const p = Product.fromFirestore(doc.id, doc.data());
                skuMap[p.sku] = p;
            });
        }

        // Step 6: Batch fetch reviews
        const reviewMap: Record<string, EtsyReview> = {};
        for (let i = 0; i < orderIds.length; i += 10) {
            const reviewBatchIds = orderIds.slice(i, i + 10);
            const reviewQuery = query(reviewsRef, where("orderId", "in", reviewBatchIds));
            const reviewSnapshot = await getDocs(reviewQuery);
            reviewSnapshot.docs.forEach(doc => {
                const data = doc.data() as EtsyReview;
                reviewMap[data.orderId] = data;
            });
        }

        // Step 7: Assemble final grouped orders
        const itemsGroupedByOrder: Record<string, EtsyOrder> = {};

        for (const data of orderItemDocs) {
            const orderId = data.orderId;
            const buyerName = data.shippingAddress?.name || "";
            const buyerUsername = data.buyer || "Unknown";

            const [firstname, ...rest] = buyerName.split(" ");
            const lastname = rest.join(" ");

            const product = {
                sku: data.sku || "N/A",
                quantity: data.quantity,
                price: data.price,
                productName: data.itemName || "Unknown Product",
                correspondingProduct: skuMap[data.sku] || undefined,
            };

            if (!itemsGroupedByOrder[orderId]) {
                itemsGroupedByOrder[orderId] = {
                    orderId,
                    buyer: {
                        name: buyerName,
                        username: buyerUsername,
                        firstname,
                        lastname,
                    },
                    email: "",
                    orderDetails: {
                        orderType: data.orderType || "online",
                        currency: data.currency || "USD",
                        orderValue: data.itemTotal || 0,
                        orderNet: data.price || 0,
                        orderTotal: data.itemTotal || 0,
                        saleDate: data.saleDate,
                        status: "completed",
                    },
                    shipping: {
                        shippingCost: data.orderShipping || 0,
                        shippingDiscount: data.shippingDiscount || 0,
                        dateShipped: data.dateShipped,
                        address: {
                            name: buyerName,
                            street1: data.shippingAddress?.address1 || "",
                            street2: data.shippingAddress?.address2 || "",
                            city: data.shippingAddress?.city || "",
                            state: data.shippingAddress?.state || "",
                            zipcode: data.shippingAddress?.zipcode || "",
                            country: data.shippingAddress?.country || "",
                        },
                    },
                    discount: {
                        couponCode: data.couponCode || null,
                        details: data.couponDetails || null,
                        discountAmount: data.discountAmount || 0,
                        inPersonDiscount: data.inPersonDiscount || null,
                    },
                    payment: {
                        method: "Credit Card",
                        type: data.paymentType || "online_cc",
                        fees: 0,
                        adjustedFees: 0,
                    },
                    tax: {
                        salesTax: data.orderSalesTax || 0,
                    },
                    review: reviewMap[orderId] || null,
                    products: [],
                    etsyStatus: "completed",
                    isFollowupDone: false,
                    isRepeatOrder: false,
                };
            }

            itemsGroupedByOrder[orderId].products.push(product);
        }

        return Object.values(itemsGroupedByOrder);
    } catch (err) {
        console.error("❌ Error fetching Etsy order items:", err);
        throw err;
    }
}

export async function apiGetCustomerRelatedEtsyOrders2(referenceOrderId: string): Promise<EtsyOrder[]> {
    try {
        const ordersRef = collection(db, "etsy_orders");
        const itemsRef = collection(db, "etsy_orders_items");
        const reviewsRef = collection(db, "etsy_reviews");
        const productsRef = collection(db, "products");

        // 🔍 Step 1: Get the reference order
        const orderDoc = await getDoc(doc(ordersRef, referenceOrderId));
        if (!orderDoc.exists()) throw new Error("Reference order not found");

        const currentOrder = orderDoc.data();
        const customerName = currentOrder.buyer?.username || "";
        if (!customerName) throw new Error("Customer name missing");

        // 🔍 Step 2: Fetch all orders by this customer
        const customerOrdersQuery = query(ordersRef, where("buyer.username", "==", customerName));
        const customerOrdersSnapshot = await getDocs(customerOrdersQuery);

        const orderIds = customerOrdersSnapshot.docs.map(doc => doc.id);
        if (orderIds.length === 0) return [];

        // 🔍 Step 3: Fetch all order items for those orderIds
        const allItemsSnapshot = await getDocs(itemsRef);
        const relevantItems = allItemsSnapshot.docs
            .map(d => d.data())
            .filter(item => orderIds.includes(item.orderId));

        const itemsGroupedByOrder: Record<string, EtsyOrder> = {};

        for (const data of relevantItems) {
            const orderId = data.orderId;
            const buyerName = data.shippingAddress?.name || "";
            const buyerUsername = data.buyer || "Unknown";

            // 🔍 Enrich product
            const sku = data.sku?.trim() || "";
            const matched = sku
                ? await getDocs(query(productsRef, where("sku", "==", sku)))
                : null;
            const correspondingProduct = matched?.docs[0]
                ? Product.fromFirestore(matched.docs[0].id, matched.docs[0].data())
                : undefined;

            const product = {
                sku,
                quantity: data.quantity,
                price: data.price,
                productName: data.itemName || "Unknown Product",
                correspondingProduct,
            };

            const [firstname, ...rest] = buyerName.split(" ");
            const lastname = rest.join(" ");

            // 📦 Group products under the order
            if (!itemsGroupedByOrder[orderId]) {
                // fetch review once per order
                const reviewQuery = query(reviewsRef, where("orderId", "==", orderId));
                const reviewSnapshot = await getDocs(reviewQuery);
                const review = reviewSnapshot.docs[0]?.data() as EtsyReview | undefined || null;

                itemsGroupedByOrder[orderId] = {
                    orderId,
                    buyer: {
                        name: buyerName,
                        username: buyerUsername,
                        firstname,
                        lastname,
                    },
                    email: "",
                    orderDetails: {
                        orderType: data.orderType || "online",
                        currency: data.currency || "USD",
                        orderValue: data.itemTotal || 0,
                        orderNet: data.price || 0,
                        orderTotal: data.itemTotal || 0,
                        saleDate: data.saleDate,
                        status: "completed",
                    },
                    shipping: {
                        shippingCost: data.orderShipping || 0,
                        shippingDiscount: data.shippingDiscount || 0,
                        dateShipped: data.dateShipped,
                        address: {
                            name: buyerName,
                            street1: data.shippingAddress?.address1 || "",
                            street2: data.shippingAddress?.address2 || "",
                            city: data.shippingAddress?.city || "",
                            state: data.shippingAddress?.state || "",
                            zipcode: data.shippingAddress?.zipcode || "",
                            country: data.shippingAddress?.country || "",
                        },
                    },
                    discount: {
                        couponCode: data.couponCode || null,
                        details: data.couponDetails || null,
                        discountAmount: data.discountAmount || 0,
                        inPersonDiscount: data.inPersonDiscount || null,
                    },
                    payment: {
                        method: "Credit Card",
                        type: data.paymentType || "online_cc",
                        fees: 0,
                        adjustedFees: 0,
                    },
                    tax: {
                        salesTax: data.orderSalesTax || 0,
                    },
                    review,
                    products: [],
                    etsyStatus: "completed",
                    isFollowupDone: false,
                    isRepeatOrder: false,
                };
            }

            itemsGroupedByOrder[orderId].products.push(product);
        }

        return Object.values(itemsGroupedByOrder);
    } catch (err) {
        console.error("❌ Error fetching Etsy order items:", err);
        throw err;
    }
}