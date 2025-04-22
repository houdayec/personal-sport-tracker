import { getFirestore, collection, getDocs, writeBatch, query, where, updateDoc, doc } from 'firebase/firestore'
import Button from '@/components/ui/Button'

const ResetFollowupStatusButton = () => {
    const handleReset = async () => {
        const db = getFirestore()
        const ordersRef = collection(db, 'etsy_orders')
        const snapshot = await getDocs(ordersRef)

        if (snapshot.empty) {
            console.warn('No orders found.')
            return
        }

        const batch = writeBatch(db)

        snapshot.forEach((doc) => {
            batch.update(doc.ref, { isFollowupDone: false })
        })

        try {
            await batch.commit()
            console.log('All orders updated successfully.')
        } catch (err) {
            console.error('Error updating orders:', err)
        }
    }

    const markFollowupDoneAfterDate = async () => {
        // Timestamp for 23 March 2025 (00:00:00 UTC)
        const targetTimestamp = new Date('2025-03-23').getTime()
        const db = getFirestore()

        console.log('🔍 Fetching orders after:', targetTimestamp)

        const ordersRef = collection(db, 'etsy_orders')
        const q = query(
            ordersRef,
            where('orderDetails.saleDate', '>', targetTimestamp)
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
        <Button onClick={markFollowupDoneAfterDate}>Reset Follow-Up Status 27</Button>
    )
}

export default ResetFollowupStatusButton