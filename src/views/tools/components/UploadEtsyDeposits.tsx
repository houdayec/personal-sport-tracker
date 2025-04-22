import { useState } from "react"
import { collection, getDocs, setDoc, doc } from "firebase/firestore"
import { db } from "@/firebase"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "@/components/ui/toast"
import Notification from "@/components/ui/Notification"
import Papa from "papaparse"
import MurmurHash3 from "imurmurhash"
import { EtsyDeposit } from "@/@types/etsy_deposit"
import { HiOutlineCurrencyDollar } from "react-icons/hi"
import { Card, Upload } from "@/components/ui"
import { showToast } from "@/utils/toastUtils"
import { s } from "@fullcalendar/core/internal-common"

const UploadEtsyDeposits = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)

    const handleFileUpload = (files: File[], fileList: File[]) => {
        const file = files?.[0];
        if (!file) return

        const validFilename = /^EtsyDeposits\d{4}(?: \(\d+\))?\.csv$/i.test(file.name)
        if (!validFilename) {
            showToast({
                type: 'danger',
                title: 'Invalid File',
                message: "File must be named like EtsyDeposits.csv or EtsyDeposits (1).csv",
            })
            setCsvFile(null)
            return
        }

        setCsvFile(file)
    }

    const uploadDeposits = async () => {

        if (!csvFile) return
        setLoading(true)

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const snapshot = await getDocs(collection(db, "etsy_deposits"))
                const existingHashes = new Set(snapshot.docs.map(d => d.id))

                let uploaded = 0

                for (const row of results.data as any[]) {
                    const deposit = EtsyDeposit.fromCSV(row)
                    const hash = MurmurHash3(`${deposit.date.toISOString()}|${deposit.amount}`).result().toString()

                    if (existingHashes.has(hash)) {
                        continue
                    }

                    await setDoc(doc(db, "etsy_deposits", hash), {
                        ...deposit,
                        date: deposit.date.toISOString(),
                    })
                    uploaded++
                }

                showToast({
                    type: 'success',
                    title: 'Upload Successful',
                    message: `${uploaded} deposit${uploaded !== 1 ? 's' : ''} uploaded`
                })

                setCsvFile(null)
                setLoading(false)
            },
            error: (err) => {
                console.error("❌ CSV parse error", err)
                showToast({
                    type: 'danger',
                    title: 'Error parsing CSV.',
                    message: `${err}`,
                })
                setLoading(false)
            },
        })
    }

    return (
        <Card className="bg-white">
            <div className="flex items-center mb-2">
                <HiOutlineCurrencyDollar className="text-xl text-green-600 mr-2" />
                <h2 className="text-lg font-semibold">Upload Etsy Deposits</h2>
            </div>            <p className="text-sm text-gray-600 mb-4">
                Upload your <strong>EtsyDeposits.csv</strong> file. We will only save new deposits.
            </p>
            <Upload draggable accept=".csv" onChange={handleFileUpload} />
            <Button
                variant="twoTone"
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

export default UploadEtsyDeposits
