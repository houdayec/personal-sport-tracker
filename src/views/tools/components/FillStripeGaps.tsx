import { useState } from 'react'
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase'
import Button from '@/components/ui/Button'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import MurmurHash3 from 'imurmurhash'

const FillStripeGapsButton = () => {
    const [loading, setLoading] = useState(false)

    const handleFillStripe = async () => {
        setLoading(true)

        try {
            const cutoff = new Date('2024-06-23T21:00:00.000Z')
            const ref = collection(db, 'etsy_deposits')
            const q = query(ref, where('date', '<=', cutoff.toISOString()))
            const snapshot = await getDocs(q)

            let created = 0

            for (const docSnap of snapshot.docs) {
                const { date } = docSnap.data()
                const hash = MurmurHash3(date + '|0').result().toString()

                await setDoc(doc(db, 'stripe_deposits', hash), {
                    amount: 0,
                    arrivalDate: date,
                })

                created++
            }

            toast.push(
                <Notification title="✅ Stripe Gaps Filled" type="success">
                    {created} fake stripe deposits created
                </Notification>
            )
        } catch (err) {
            console.error('❌ Error creating stripe gaps:', err)
            toast.push(
                <Notification title="Error" type="danger">
                    Failed to fill gaps
                </Notification>
            )
        }

        setLoading(false)
    }

    return (
        <div className="mt-6">
            <Button loading={loading} onClick={handleFillStripe}>
                Fill Stripe Gaps Until 17/06/2024
            </Button>
        </div>
    )
}

export default FillStripeGapsButton
