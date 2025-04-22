// src/models/woo_order.ts

export type WooOrderProduct = {
    productId: string
    productName: string
    sku: string
    quantity: number
}

export class WooOrder {
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

    // src/models/woo_order.ts

    // 🔄 Converts Firestore document data to WooOrder instance
    static fromFirestore(data: any): WooOrder {
        return new WooOrder({
            id: data.id,
            date: data.date,
            customer: data.customer,
            customerFirstName: data.customerFirstName,
            customerLastName: data.customerLastName,
            customerEmail: data.customerEmail,
            status: data.status,
            paymentMethod: data.paymentMethod,
            paymentIdentifier: data.paymentIdentifier,
            totalAmount: data.totalAmount,
            currency: data.currency,
            products: (data.products || []).map((p: any) => ({
                productId: p.productId,
                productName: p.productName,
                sku: p.sku,
                quantity: p.quantity,
            })),
            hasLicense: data.hasLicense,
            licenseDelivered: data.licenseDelivered,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            fee: data.fee,
            netTotal: data.netTotal,
        });
    }

}

