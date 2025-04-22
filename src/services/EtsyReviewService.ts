import { collection, query, where, getDocs, orderBy, limit, startAfter, Query, getDoc, doc, DocumentData } from "firebase/firestore";
import { db } from "@/firebase"; // Adjust the import if needed
import { TableQueries } from "@/@types/common";
import { EtsyOrder, EtsyOrderItem } from "@/@types/etsy_order";
import { Product } from "@/@types/product";
import { EtsyReview } from "@/@types/etsy_review";
import { EtsyReviewFilterQueries } from "@/views/etsy/Reviews/store/etsyReviewsSlice";

export async function apiGetEtsyReviews<T, U extends TableQueries & { filterData?: EtsyReviewFilterQueries }>(params: U) {
    try {
        const {
            pageIndex = 1,
            pageSize = 50,
            filterData = {},
        } = params;

        console.log("🚀 Fetching Etsy reviews with params:", params);

        const skipCount = (pageIndex - 1) * pageSize;
        const reviewsRef = collection(db, "etsy_reviews");

        const filters: any[] = [];

        // Handle rating array safely
        if (filterData.starRating !== undefined && filterData.starRating !== null) {
            filters.push(where("starRating", "==", filterData.starRating));
        }

        if (filterData.syncWithWordPress !== undefined && filterData.syncWithWordPress !== null) {
            filters.push(where("syncWithWordPress", "==", filterData.syncWithWordPress));
        }

        if (filterData.treated !== undefined && filterData.treated !== null) {
            filters.push(where("treated", "==", filterData.treated));
        }

        if (filterData.onlyBadReviews) {
            filters.push(where("starRating", "<=", 3));
        }

        console.log(filters);

        // Base query
        let baseQuery: Query<DocumentData> = query(
            reviewsRef,
            ...filters,
            orderBy("dateReviewed", "desc"),
            limit(pageSize)
        );

        // Pagination logic (only run if pageIndex > 1)
        if (pageIndex > 1 && skipCount > 0) {
            const skipQuery = query(
                reviewsRef,
                ...filters,
                orderBy("dateReviewed", "desc"),
                limit(skipCount)
            );
            const skipSnapshot = await getDocs(skipQuery);
            const lastVisible = skipSnapshot.docs.at(-1);

            if (lastVisible) {
                baseQuery = query(
                    reviewsRef,
                    ...filters,
                    orderBy("dateReviewed", "desc"),
                    startAfter(lastVisible),
                    limit(pageSize)
                );
            }
        }

        const snapshot = await getDocs(baseQuery);

        // After fetching reviews snapshot
        const reviews: EtsyReview[] = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const review = EtsyReview.fromFirestore(docSnap.id, docSnap.data() as Partial<EtsyReview>)

                if (!review.orderId) {
                    console.warn(`⚠️ Review ${review.id} has no orderId.`)
                    return review
                }

                console.log(`🔍 Fetching items for orderId: ${review.orderId}`)

                try {
                    const orderItemsQuery = query(
                        collection(db, "etsy_orders_items"),
                        where("orderId", "==", review.orderId)
                    )

                    const orderItemsSnap = await getDocs(orderItemsQuery)

                    if (orderItemsSnap.empty) {
                        console.warn(`❌ No order items found for orderId: ${review.orderId}`)
                        return review
                    }

                    const items: EtsyOrderItem[] = await Promise.all(
                        orderItemsSnap.docs.map(async (itemDoc) => {
                            const item = itemDoc.data() as EtsyOrderItem

                            try {
                                const productQuery = query(
                                    collection(db, "products"),
                                    where("sku", "==", item.sku)
                                )
                                const productSnap = await getDocs(productQuery)

                                if (!productSnap.empty) {
                                    const docRef = productSnap.docs[0]
                                    const product = Product.fromFirestore(docRef.id, docRef.data())
                                    item.correspondingProduct = product
                                    console.log(`✅ Loaded product for SKU: ${item.sku}`)
                                } else {
                                    console.warn(`❌ No product found with SKU: ${item.sku}`)
                                }
                            } catch (err) {
                                console.error(`❌ Error fetching product for SKU ${item.sku}:`, err)
                            }

                            return item
                        })
                    )

                    review.items = items
                } catch (err) {
                    console.error(`❌ Error fetching order items for review ${review.id}:`, err)
                }

                return review
            })
        )


        console.log("Fetched reviews:", reviews);

        return {
            data: reviews,
            total: 2000, // Arbitrary total since we skip count querying
        };
    } catch (error) {
        console.error("❌ Error fetching Etsy reviews:", error);
        throw new Error("Failed to fetch Etsy reviews.");
    }
}
