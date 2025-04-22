import { useState } from 'react'
import { collection, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Papa from 'papaparse'
import { Card } from '@/components/ui'

const UploadFontData = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const validFilename = /^FontData(?: \(\d+\))?\.csv$/i.test(file.name)
        if (!validFilename) {
            toast.push(
                <Notification title="❌ Invalid File" type="danger">
                    File must be named <strong>FontData.csv</strong>
                </Notification>
            )
            return
        }

        setCsvFile(file)
    }

    const uploadFontData = async () => {
        if (!csvFile) return
        setLoading(true)

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                let updated = 0

                for (const row of results.data as any[]) {
                    const sku = row['SKU']
                    if (!sku) continue

                    const ref = doc(db, "products", sku)
                    const snap = await getDoc(ref)

                    if (!snap.exists()) continue

                    await setDoc(ref, {
                        name: row['Nom'] || snap.data().name,
                        publishedOnEtsy: row['Etsy']?.toLowerCase() === 'true',
                        publishedOnWebsite: row['Website']?.toLowerCase() === 'true',
                        fontData: {
                            publishedOnTpt: row['Tpt']?.toLowerCase() === 'true',
                        },
                    }, { merge: true })

                    updated++
                }

                toast.push(
                    <Notification title="Update Complete" type="success">
                        {updated} product{updated !== 1 ? 's' : ''} updated
                    </Notification>
                )

                setCsvFile(null)
                setLoading(false)
            },
            error: (err) => {
                console.error('❌ CSV parse error', err)
                toast.push(
                    <Notification title="Error" type="danger">
                        Failed to parse CSV file
                    </Notification>
                )
                setLoading(false)
            },
        })
    }

    return (
        <Card className="bg-white">
            <h2 className="text-lg font-semibold mb-2">📝 Upload Font Data</h2>
            <p className="text-sm text-gray-600 mb-4">
                Upload your <strong>FontData.csv</strong> file to update font products.
            </p>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            <Button
                className="mt-4"
                onClick={uploadFontData}
                disabled={!csvFile || loading}
                loading={loading}
            >
                Upload Font Data
            </Button>
        </Card>
    )
}

export default UploadFontData
