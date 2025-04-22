import { useState } from "react"
import { collection, getDocs, setDoc, doc } from "firebase/firestore"
import { db } from "@/firebase"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "@/components/ui/toast"
import Notification from "@/components/ui/Notification"
import Papa from "papaparse"
import { Product } from "@/@types/product"
import { Card } from "@/components/ui"

const UploadEmbroideryFontData = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const validFilename = /^EmbroideryFontData(?: \(\d+\))?\.csv$/i.test(file.name)
        if (!validFilename) {
            toast.push(
                <Notification title="❌ Invalid File" type="danger">
                    File must be named like <strong>EmbroideryFontData.csv</strong>
                </Notification>
            )
            return
        }

        setCsvFile(file)
    }

    const uploadData = async () => {
        if (!csvFile) return
        setLoading(true)

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const existingDocs = await getDocs(collection(db, "products"))
                const existingSKUs = new Set(existingDocs.docs.map(doc => doc.id))

                let updated = 0

                for (const row of results.data as any[]) {
                    const sku = row["SKU"]
                    if (!sku || !existingSKUs.has(sku)) continue

                    const ref = doc(db, "products", sku)
                    const updateData = {
                        name: row["Nom"] || "",
                        category: "football_font",
                        embroideryFontData: {
                            sizes: row["Tailles"]?.split(",").map((s: string) => s.trim()) || [],
                            characters: row["Caractères"]?.split(",").map((c: string) => c.trim()) || [],
                            specialCharacters: row["Caractères spéciaux"]
                                ? Array.from(row["Caractères spéciaux"].replace(/\s+/g, ''))
                                : [],
                        },
                        status: row["Statut"] === "Publié" ? "published" : "draft",
                        publishedOnEtsy: row["Publié sur Etsy"] === "TRUE",
                        publishedOnWebsite: row["Publié sur website"] === "TRUE",
                    }

                    if (row["Lien Etsy"]) {
                        updateData["etsy"] = { link: row["Lien Etsy"] }
                    }

                    await setDoc(ref, updateData, { merge: true })
                    updated++
                }

                toast.push(
                    <Notification title="✅ Update Complete" type="success">
                        {updated} product{updated !== 1 ? "s" : ""} updated
                    </Notification>
                )

                setCsvFile(null)
                setLoading(false)
            },
            error: (err) => {
                console.error("❌ CSV Parse Error", err)
                toast.push(
                    <Notification title="Error" type="danger">
                        Failed to parse CSV
                    </Notification>
                )
                setLoading(false)
            },
        })
    }

    return (
        <Card className="bg-white">
            <h2 className="text-lg font-semibold mb-2">🧵 Upload Embroidery Font Data</h2>
            <p className="text-sm text-gray-600 mb-4">
                Upload <strong>EmbroideryFonts.csv</strong> to update your product info.
            </p>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            <Button
                className="mt-4"
                onClick={uploadData}
                disabled={!csvFile || loading}
                loading={loading}
            >
                Upload & Update Products
            </Button>
        </Card>
    )
}

export default UploadEmbroideryFontData
