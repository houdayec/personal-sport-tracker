import { useState } from 'react'
import Papa from 'papaparse'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import MurmurHash3 from 'imurmurhash'
import { Card } from '@/components/ui'

const UploadStripeDeposits = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const validName = /^payouts(?:\s\(\d+\))?\.csv$/i.test(file.name)
        if (!validName) {
            toast.push(
                <Notification title="❌ Invalid File" type="danger">
                    Please upload a valid <strong>payouts.csv</strong> file
                </Notification>
            )
            return
        }

        setCsvFile(file)
    }

    const uploadDeposits = async () => {
        if (!csvFile) return
        setLoading(true)

        const existing = await getDocs(collection(db, 'stripe_deposits'))
        const hashes = new Set(existing.docs.map((doc) => doc.id))

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async ({ data }) => {
                let uploaded = 0

                for (const row of data as any[]) {
                    const date = new Date(row['Arrival Date (UTC)'])
                    const amount = parseFloat(row['Amount'])
                    const hash = MurmurHash3(`${date.toISOString()}|${amount}`).result().toString()

                    if (hashes.has(hash)) continue

                    await setDoc(doc(db, 'stripe_deposits', hash), {
                        amount,
                        currency: row['Currency'],
                        arrivalDate: date.toISOString(),
                        sourceType: row['Source Type'],
                        method: row['Method'],
                        status: row['Status'],
                        destination: {
                            name: row['Destination Name'],
                            country: row['Destination Country'],
                            last4: row['Destination Last 4'],
                        },
                    })

                    uploaded++
                }

                toast.push(
                    <Notification title="✅ Upload Complete" type="success">
                        {uploaded} Stripe deposit{uploaded !== 1 ? 's' : ''} uploaded
                    </Notification>
                )

                setLoading(false)
                setCsvFile(null)
            },
            error: (err) => {
                toast.push(
                    <Notification title="❌ Error" type="danger">
                        CSV parse failed
                    </Notification>
                )
                console.error(err)
                setLoading(false)
            },
        })
    }

    return (
        <Card className="bg-white">
            <h2 className="text-lg font-semibold mb-2">🏦 Upload Stripe Deposits</h2>
            <p className="text-sm text-gray-600 mb-4">
                Upload your <strong>payouts.csv</strong> file from Stripe. We will skip already uploaded records.
            </p>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            <Button
                className="mt-4"
                onClick={uploadDeposits}
                disabled={!csvFile || loading}
                loading={loading}
            >
                Upload Deposits
            </Button>
        </Card>
    )
}

export default UploadStripeDeposits
