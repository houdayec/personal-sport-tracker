import { useState } from "react";
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, where, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import Button from "@/components/ui/Button";
import { Product } from "@/@types/product";
import WordpressApiService from "@/services/WordpressService";
import Papa from "papaparse";
import toast from "@/components/ui/toast";
import { Card, Input, Upload } from "@/components/ui";
import Notification from '@/components/ui/Notification'
import { HiOutlineTag } from "react-icons/hi";
import { showToast } from "@/utils/toastUtils";

const uploadEtsyCSVToFirebase = async (etsyProducts: any[]) => {
    let successCount = 0
    let updatedCount = 0
    let errorCount = 0

    for (const row of etsyProducts) {
        const SKU = row?.SKU
        if (!SKU) {
            console.warn("❌ Missing SKU in row, skipping:", row)
            errorCount++
            continue
        }

        const ref = doc(db, "products", SKU)
        const snap = await getDoc(ref)

        const product = snap.exists() ? new Product(snap.data()) : Product.fromEtsyCSV(row)

        // Always update Etsy fields from CSV (fresh data)
        const {
            TITLE,
            DESCRIPTION,
            PRICE,
            CURRENCY_CODE,
            QUANTITY,
            TAGS,
            MATERIALS,
            IMAGE1, IMAGE2, IMAGE3, IMAGE4, IMAGE5, IMAGE6, IMAGE7, IMAGE8, IMAGE9, IMAGE10,
        } = row

        const images = [IMAGE1, IMAGE2, IMAGE3, IMAGE4, IMAGE5, IMAGE6, IMAGE7, IMAGE8, IMAGE9, IMAGE10].filter(Boolean)

        try {
            await setDoc(ref, product.cleanForDatabase(), { merge: true })
            console.log(`🔄 Updated product ${SKU} from CSV`)
            updatedCount++
        } catch (err) {
            console.error(`❌ Failed to process product ${SKU}:`, err)
            errorCount++
        }
    }

    toast.push(
        <Notification
            title="📦 Etsy CSV Sync Complete"
            type={updatedCount > 0 ? 'success' : 'warning'}
            duration={4000}
        >
            🔄 {updatedCount} updated &nbsp;|&nbsp;
            ❌ {errorCount} failed
        </Notification>,
        {
            placement: 'bottom-start',
        }
    )
}

const UploadEtsyProducts = () => {
    const [loading, setLoading] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const handleFileUpload = (files: File[], fileList: File[]) => {
        const file = files?.[0];
        if (!file) return;

        const validFilenamePattern = /^EtsyListingsDownload(?: \(\d+\))?\.csv$/

        if (!validFilenamePattern.test(file.name)) {
            showToast({
                type: 'danger',
                title: 'Invalid file',
                message: 'Please upload a valid CSV file named like EtsyListingsDownload.csv',
            })
            return
        }

        setCsvFile(file)
    }

    const handleParseCSV = async () => {
        if (!csvFile) {
            console.log("Please upload a CSV file.")
            return;
        }

        setLoading(true);
        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                console.log("✅ Parsed CSV Data:", results.data)
                await uploadEtsyCSVToFirebase(results.data)
                setLoading(false)
            },
            error: (error) => {
                console.error("❌ Error parsing CSV:", error)
                setLoading(false)
            },
        });
    };

    async function bulkUpdateProducts() {
        try {
            const productsRef = collection(db, "products");
            const snapshot = await getDocs(productsRef); // ✅ Ensure getDocs is awaited

            if (!snapshot.empty) {
                const updatePromises = snapshot.docs.map((docSnapshot) => {
                    const sku = docSnapshot.id; // ✅ Firestore document ID (SKU)
                    return updateProductFields(sku, {
                        lastReviewUpdate: true, // ✅ Set timestamp for last review update
                        wordpressId: "",       // ✅ Placeholder WordPress ID
                        etsyId: "",            // ✅ Placeholder Etsy ID
                    });
                });

                await Promise.all(updatePromises);
                console.log("✅ All products updated successfully");
            } else {
                console.log("⚠️ No products found in Firestore.");
            }
        } catch (error) {
            console.error("❌ Error updating products:", error);
        }
    }

    async function updateProductFields(
        sku: string,
        updateData: {
            lastReviewUpdate?: boolean;
            wordpressId?: string;
            etsyId?: string;
        }
    ) {
        try {
            const productRef = doc(db, "products", sku);
            const updatePayload: Record<string, any> = {};

            if (updateData.lastReviewUpdate) {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                updatePayload.wordpressReviewUpdatedAt = Math.floor(sixMonthsAgo.getTime() / 1000);
            }

            if (updateData.wordpressId) {
                updatePayload.wordpressId = updateData.wordpressId;
            }

            if (updateData.etsyId) {
                updatePayload.etsyId = updateData.etsyId;
            }

            await updateDoc(productRef, updatePayload);
            console.log(`✅ Product ${sku} updated successfully in Firestore`);
        } catch (error) {
            console.error(`❌ Error updating product ${sku}:`, error);
            throw new Error("Failed to update product fields");
        }
    }

    async function fetchAllWooCommerceProducts(): Promise<Record<string, number>> {
        let allProducts: { id: number; sku: string }[] = [];
        let page = 1;
        const perPage = 100; // ✅ WooCommerce API limit

        console.log("🔄 Fetching all products from WooCommerce...");

        while (true) {
            try {
                const response = await WordpressApiService.fetchData<{ id: number; sku: string }[]>({
                    url: `/products`,
                    method: "get",
                    params: {
                        per_page: perPage,
                        page: page,
                        consumer_key: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
                        consumer_secret: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
                    },
                });

                // ✅ Fix: Access response.data instead of response
                if (!response.data || response.data.length === 0) break;

                allProducts = [...allProducts, ...response.data]; // ✅ Append new data
                console.log(`📦 Retrieved ${response.data.length} products from WooCommerce (Page ${page})`);

                page++; // ✅ Move to next page
            } catch (error) {
                console.error("❌ Error fetching WooCommerce products:", error);
                break;
            }
        }

        console.log(`✅ Fetched ${allProducts.length} total products from WooCommerce.`);

        // ✅ Convert WooCommerce products into a mapping { SKU: WordPress ID }
        const productMap: Record<string, number> = {};
        allProducts.forEach(product => {
            if (product.sku) {
                productMap[product.sku] = product.id;
            }
        });

        return productMap;
    }

    async function updateFirestoreWithWooCommerceIds() {
        try {
            const productMap = await fetchAllWooCommerceProducts();
            console.log("🔍 WooCommerce Product Map:", productMap);

            // ✅ Get all products from Firestore
            const productsRef = collection(db, "products");
            const productsSnapshot = await getDocs(productsRef);

            if (productsSnapshot.empty) {
                console.log("✅ No products found in Firestore.");
                return;
            }

            console.log(`🔍 Found ${productsSnapshot.size} products in Firestore.`);

            // ✅ Loop through Firestore products and update their WordPress IDs
            for (const productDoc of productsSnapshot.docs) {
                const productData = productDoc.data();
                const sku = productData.sku || productDoc.id; // Use SKU from data or Firestore ID

                if (sku && productMap[sku]) {
                    const wordpressId = productMap[sku];

                    console.log(`📌 Updating SKU ${sku} -> WordPress ID: ${wordpressId}`);

                    // ✅ Update Firestore with the WordPress ID
                    await updateDoc(doc(db, "products", productDoc.id), {
                        wordpressId,
                    });
                }
            }

            console.log("🎉 Firestore update process completed.");
        } catch (error) {
            console.error("❌ Error updating Firestore with WooCommerce IDs:", error);
        }
    }

    return (
        <Card className="bg-white">
            <div className="flex items-center mb-4">
                <HiOutlineTag className="text-xl text-indigo-600 mr-2" />
                <h2 className="text-lg font-semibold">Upload Etsy Products</h2>
            </div>
            <p className="text-md mb-4">Get <strong>EtsyListingsDownload.csv</strong> from Etsy Download Page</p>
            <Upload draggable accept=".csv" onChange={handleFileUpload} />
            <Button variant="twoTone" onClick={handleParseCSV} loading={loading} disabled={!csvFile}>
                Upload Products
            </Button>
        </Card>
    )
};

export default UploadEtsyProducts;