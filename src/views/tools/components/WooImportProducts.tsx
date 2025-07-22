import { useState } from "react"
import { collection, getDocs, updateDoc, doc } from "firebase/firestore"
import { db } from "@/firebase"
import Button from "@/components/ui/Button"
import WooCommerceApiService from "@/services/WooCommerceService"
import toast from "@/components/ui/toast"
import Notification from "@/components/ui/Notification"
import { Product } from "@/@types/product"
import { Card } from "@/components/ui"

const ImportWoocommerceProducts = () => {
    const [loading, setLoading] = useState(false)

    async function fetchAllWooCommerceProducts(): Promise<Record<string, Partial<Product>["wordpress"]>> {
        let allProducts: any[] = []
        let page = 1
        const perPage = 100

        while (true) {
            try {
                const response = await WooCommerceApiService.fetchData<any[]>({
                    url: `/products`,
                    method: "get",
                    params: {
                        per_page: perPage,
                        page: page,
                        consumer_key: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
                        consumer_secret: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
                    },
                })

                if (!response.data || response.data.length === 0) break

                allProducts = [...allProducts, ...response.data]
                page++
            } catch (error) {
                console.error("❌ Error fetching WooCommerce products:", error)
                break
            }
        }

        const productMap: Record<string, Partial<Product>["wordpress"]> = {}
        allProducts.forEach(product => {
            if (product.sku) {
                productMap[product.sku] = {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    link: product.permalink,
                    permalink: product.slug,
                    price: parseFloat(product.price || product.regular_price || "0"),
                    images: product.images?.map((img: any) => img.src),
                    status: product.status,
                    categories: product.categories?.map((c: any) => c.name),
                    tags: product.tags?.map((t: any) => t.name),
                    description: product.description,
                    shortDescription: product.short_description,
                    averageRating: parseFloat(product.average_rating),
                    ratingCount: product.rating_count,
                    downloadable: product.downloadable,
                    downloads: product.downloads,
                    downloadLimit: product.download_limit,
                    downloadExpiry: product.download_expiry,
                    lastSyncedAt: Date.now()
                }
            }
        })

        return productMap
    }

    async function updateFirestoreWithWooCommerceData() {
        const productMap = await fetchAllWooCommerceProducts()
        const productsRef = collection(db, "products")
        const snapshot = await getDocs(productsRef)

        for (const docSnap of snapshot.docs) {
            const productData = docSnap.data()
            const sku = productData.sku || docSnap.id

            if (sku && productMap[sku]) {
                console.log(`Updating ${sku} with WordPress data`)
                await updateDoc(doc(db, "products", docSnap.id), {
                    wordpress: productMap[sku]
                })
            }
        }

        console.log("✅ Firestore update complete")
    }

    return (
        <Card className="bg-white">
            <h2 className="text-lg font-semibold mb-2">🔄 Sync WooCommerce Products</h2>
            <p className="text-sm text-gray-600 mb-4">
                This will sync products from WooCommerce and update the `wordpress` field in Firestore.
            </p>
            <Button
                variant="twoTone"
                onClick={async () => {
                    setLoading(true)
                    try {
                        await updateFirestoreWithWooCommerceData()
                        toast.push(
                            <Notification title="✅ Sync Complete" type="success">
                                WooCommerce data synced to Firestore successfully.
                            </Notification>,
                            { placement: "top-center" }
                        )
                    } catch (error) {
                        console.error(error)
                        toast.push(
                            <Notification title="❌ Sync Failed" type="danger">
                                Something went wrong during WooCommerce sync.
                            </Notification>,
                            { placement: "top-center" }
                        )
                    } finally {
                        setLoading(false)
                    }
                }}
                loading={loading}
            >
                {loading ? "Syncing Products..." : "Sync Products"}
            </Button>
        </Card>
    )
}

export default ImportWoocommerceProducts