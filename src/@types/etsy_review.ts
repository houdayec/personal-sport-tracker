import { EtsyOrder, EtsyOrderItem } from "./etsy_order";

export class EtsyReview {
    id: string;
    orderId: string;
    reviewer: string;
    message: string;
    starRating: number;
    dateReviewed: number;
    syncWithWordPress: boolean;
    treated: boolean;
    items: EtsyOrderItem[] | undefined;

    constructor(data: Partial<EtsyReview> & { id: string }) {
        this.id = data.id;
        this.orderId = data.orderId || "";
        this.reviewer = data.reviewer || "Unknown";
        this.message = data.message || "";
        this.starRating = data.starRating ?? 0;
        this.dateReviewed = data.dateReviewed ?? Date.now();
        this.syncWithWordPress = data.syncWithWordPress ?? false;
        this.treated = data.treated ?? false;
    }

    toPlain() {
        return {
            orderId: this.orderId,
            reviewer: this.reviewer,
            message: this.message,
            starRating: this.starRating,
            dateReviewed: this.dateReviewed,
            syncWithWordPress: this.syncWithWordPress,
            treated: this.treated ?? false,
        }
    }

    // 📦 Convert Firestore data to EtsyReview instance
    static fromFirestore(id: string, data: Partial<EtsyReview>): EtsyReview {
        return new EtsyReview({
            id,
            ...data,
        });
    }

    // 🧾 Optional: Format review date for UI
    getFormattedDate(): string {
        return new Date(this.dateReviewed).toLocaleDateString();
    }

    // ⭐ Optional: Return review stars as a string
    getStars(): string {
        return "⭐".repeat(this.starRating);
    }

    // ✅ Check if review needs syncing
    needsSync(): boolean {
        return !this.syncWithWordPress;
    }
}
