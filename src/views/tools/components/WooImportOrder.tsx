import { useState } from "react"
import Button from "@/components/ui/Button"
import toast from "@/components/ui/toast"
import Notification from "@/components/ui/Notification"
import { auth, db } from "@/firebase"
import { collection, setDoc, doc, getDocs } from "firebase/firestore"
import WooCommerceApiService from "@/services/WooCommerceService"
import { WooOrder } from "@/@types/woo_order"
import { Card } from "@/components/ui"
import { showToast } from "@/utils/toastUtils"

const LICENSE_PRODUCT_IDS = ["6929", "7768"]

const ImportWooOrders = () => {
    const [loading, setLoading] = useState(false)

    const fetchWooIndexedOrderIds = async (): Promise<Set<string>> => {
        const indexRef = collection(db, "website_orders_indexes")
        const snapshot = await getDocs(indexRef)
        const idSet = new Set<string>()

        snapshot.forEach(doc => {
            const data = doc.data()
            if (Array.isArray(data.orderIds)) {
                data.orderIds.forEach((id: string) => idSet.add(id))
            }
        })

        return idSet
    }

    const fetchAllWooCommerceOrders = async () => {
        let allOrders: any[] = []
        let page = 1
        const perPage = 100

        while (true) {
            try {
                const response = await WooCommerceApiService.fetchData<any[]>({
                    url: `/orders`,
                    method: "get",
                    params: {
                        per_page: perPage,
                        page: page,
                        consumer_key: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
                        consumer_secret: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
                    },
                })

                if (!response.data || response.data.length === 0) break

                allOrders = [...allOrders, ...response.data]
                page++
            } catch (error) {
                console.error("❌ Error fetching WooCommerce orders:", error)
                break
            }
        }

        return allOrders
    }

    const handleImport = async () => {
        console.log(auth.currentUser)
        setLoading(true)
        try {
            console.log("🚀 Fetching WooCommerce orders...")
            const rawOrders = await fetchAllWooCommerceOrders()
            console.log(`📦 Total fetched: ${rawOrders.length}`)

            const existingIds = await fetchWooIndexedOrderIds()
            console.log(`📁 Existing IDs in index: ${existingIds.size}`)

            const newOrderIds: string[] = []

            const transformed = rawOrders.map(WooOrder.fromApi).filter(order => {
                if (!existingIds.has(order.id)) {
                    newOrderIds.push(order.id)
                    return true
                }
                return false
            })

            console.log(`🆕 New orders to upload: ${transformed.length}`)

            for (const order of transformed) {
                const containsLicense = order.products.some((item) =>
                    item.productId && LICENSE_PRODUCT_IDS.includes(item.productId)
                )

                const docData: Record<string, any> = {
                    ...order,
                    importedAt: Date.now(),
                }

                if (containsLicense) {
                    docData.licenseDelivered = false
                } else {
                    delete docData.licenseDelivered
                }

                console.log(`📤 Uploading order ${order.id}...`)
                console.log("📤 With data:", docData)
                await setDoc(doc(db, "website_orders", order.id), docData)
            }

            if (newOrderIds.length > 0) {
                console.log("🗂️ Updating index...")
                const indexRef = collection(db, "website_orders_indexes")
                const chunkSize = 50000
                const chunks = []

                for (let i = 0; i < newOrderIds.length; i += chunkSize) {
                    chunks.push(newOrderIds.slice(i, i + chunkSize))
                }

                for (let i = 0; i < chunks.length; i++) {
                    // Replace timestamp with sequential index
                    await setDoc(doc(indexRef, `index_${i}`), {
                        orderIds: chunks[i],
                        createdAt: Date.now(),
                    })
                }
                console.log("✅ Index updated.")
            }

            showToast({
                type: 'success',
                title: 'Orders Synced',
                message: `${transformed.length} new orders imported from WooCommerce.`,
            })
        } catch (error) {
            console.error("❌ Error during WooCommerce sync:", error)
            showToast({
                type: 'danger',
                title: 'Sync Failed',
                message: 'Failed to import orders from WooCommerce.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <h2 className="text-lg font-semibold mb-2">⬇️ Import Woocommerce Orders</h2>
            <p className="text-sm text-gray-600 mb-4">
                This will import orders from WooCommerce and save them to Firestore.
            </p>
            <Button
                loading={loading}
                onClick={handleImport}
                variant="twoTone"
            >
                Import WooCommerce Orders
            </Button>
        </Card>
    )
}

export default ImportWooOrders