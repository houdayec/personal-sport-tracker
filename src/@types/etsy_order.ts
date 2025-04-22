import { EtsyReview } from "./etsy_review";
import { Product } from "./product";

export type EtsyOrder = {
    orderId: string;
    buyer: {
        name: string;
        username: string;
        firstname: string;
        lastname: string;
    };
    email: string;
    orderDetails: {
        orderType: string;
        orderTotal: number;
        orderNet: number;
        orderValue: number;
        currency: string;
        saleDate: number;
        status: string;
    };
    payment: {
        method: string;
        type: string;
        fees: number;
        adjustedFees: number;
    };
    discount: {
        couponCode: string | null;
        details: string | null;
        discountAmount: number;
        inPersonDiscount: string | null;
    };
    tax: {
        salesTax: number;
    };
    shipping: {
        shippingCost: number;
        shippingDiscount: number;
        dateShipped: number;
        address: {
            name: string;
            street1: string;
            street2: string;
            city: string;
            state: string;
            country: string;
            zipcode: string;
        };
    };
    etsyStatus: "pending" | "synced" | "completed" | "cancelled" | "refunded";
    review: EtsyReview | null;
    isRepeatOrder: boolean | false;
    isFollowupDone: boolean | false;
    products: OrderProduct[];
};

type OrderProduct = {
    productName: string;
    sku: string;
    price: number;
    quantity: number;
    correspondingProduct?: Product;
};

export type EtsyOrderWithReview = EtsyOrder & {
    review: EtsyReview | null; // Allow review to be null when no review exists
};

export type EtsyOrderItem = {
    orderId: string
    transactionId: string
    saleDate: number
    itemName: string
    sku: string
    quantity: number
    price: number
    currency: string
    itemTotal: number
    orderShipping: number
    orderSalesTax: number
    shippingDiscount: number
    discountAmount: number
    couponCode: string
    couponDetails: string
    vatPaidByBuyer: number
    inPersonDiscount: string
    inPersonLocation: string
    listingId: string
    listingType: string
    orderType: string
    paymentType: string
    datePaid: number | null
    dateShipped: number | null
    buyer: string
    shippingAddress: {
        name: string
        address1: string
        address2: string
        city: string
        state: string
        zipcode: string
        country: string
    },
    correspondingProduct?: Product;
}