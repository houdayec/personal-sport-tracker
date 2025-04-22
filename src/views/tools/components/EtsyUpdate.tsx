import { useState } from "react";
import { collection, getDocs, updateDoc, doc, query, where, orderBy, limit } from "firebase/firestore";
import Button from "@/components/ui/Button";
import { db } from "@/firebase";

const ResetFollowupStatusButton = () => {
    const [loading, setLoading] = useState(false);

    const resetFollowupStatus = async () => {
        console.log('🔄 Starting follow-up status reset...')
        setLoading(true)

        try {
            const ordersRef = collection(db, 'etsy_orders')
            const q = query(
                ordersRef,
                orderBy('orderDetails.saleDate', 'desc'),
                limit(500)
            )

            console.log('📡 Fetching orders with isFollowupDone == null...')
            const snapshot = await getDocs(q)

            if (snapshot.empty) {
                console.log('✅ No orders need updating.')
                alert('No follow-up status needed resetting.')
                setLoading(false)
                return
            }

            console.log(`📦 Found ${snapshot.size} orders to update.`)

            let updatedCount = 0
            for (const orderDoc of snapshot.docs) {
                await updateDoc(doc(db, 'etsy_orders', orderDoc.id), { isFollowupDone: false })
                updatedCount++
                console.log(`✅ Updated order: ${orderDoc.id} (${updatedCount}/${snapshot.size})`)
            }

            console.log(`🎉 All ${updatedCount} orders updated successfully.`)
            alert(`Follow-up status reset for ${updatedCount} entries!`)
        } catch (error) {
            console.error('❌ Error resetting follow-up status:', error)
            alert('Error resetting follow-up status. Check console for details.')
        }

        setLoading(false)
    }

    const markFollowupDoneAfterDate = async () => {
        // Timestamp for 23 March 2025 (00:00:00 UTC)
        const targetTimestamp = new Date('2025-03-23').getTime()

        console.log('🔍 Fetching orders after:', targetTimestamp)

        const ordersRef = collection(db, 'etsy_orders')
        const q = query(
            ordersRef,
            where('orderDetails.saleDate', '<=', targetTimestamp),
            orderBy('orderDetails.saleDate', 'desc'),
            limit(500)
        )

        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            console.log('✅ No orders found after 23 March 2025')
            return
        }

        console.log(`🛠 Updating ${snapshot.size} orders...`)

        let updated = 0
        for (const docSnap of snapshot.docs) {
            await updateDoc(doc(db, 'etsy_orders', docSnap.id), { isFollowupDone: true })
            updated++
            console.log(`✅ Updated: ${docSnap.id} (${updated}/${snapshot.size})`)
        }

        console.log('🎉 Done. All matching orders updated.')
    }


    return (
        <div className="p-4">
            <Button
                variant="solid"
                onClick={markFollowupDoneAfterDate}
                disabled={loading}
            >
                {loading ? "Resetting..." : "Reset Follow-Up Status"}
            </Button>
        </div>
    );
};

export default ResetFollowupStatusButton;
