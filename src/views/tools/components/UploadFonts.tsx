import { useState } from "react";
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, where, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import Button from "@/components/ui/Button";
import { fonts, embroideryFonts } from "../../../../public/data/products"
import { Product } from "@/@types/product";
import WordpressApiService from "@/services/WordpressService";
import Papa from "papaparse";
import toast from "@/components/ui/toast";
import Notification from "@/components/ui/Notification";
import { Card } from "@/components/ui";

// 🔥 Extract Etsy ID from IMAGE1 URL
const extractEtsyId = (imageUrl: string): string | null => {
    const match = imageUrl?.match(/https:\/\/i\.etsystatic\.com\/(\d+)\//);
    return match ? match[1] : null;
};
// 🔥 Function to Format Etsy Data to Match Firebase Structure
const formatEtsyData = (etsyProduct: any) => {
    const {
        SKU,
        TITLE,
        DESCRIPTION,
        PRICE,
        CURRENCY_CODE,
        QUANTITY,
        TAGS,
        MATERIALS,
        IMAGE1, IMAGE2, IMAGE3, IMAGE4, IMAGE5, IMAGE6, IMAGE7, IMAGE8, IMAGE9, IMAGE10,
        VARIATION_1_TYPE, VARIATION_1_NAME, VARIATION_1_VALUES,
        VARIATION_2_TYPE, VARIATION_2_NAME, VARIATION_2_VALUES
    } = etsyProduct;

    // ✅ Extract Etsy ID from IMAGE1 URL
    const etsyId = IMAGE1 ? extractEtsyId(IMAGE1) : null;

    // ✅ Format images while preserving order
    const images = [IMAGE1, IMAGE2, IMAGE3, IMAGE4, IMAGE5, IMAGE6, IMAGE7, IMAGE8, IMAGE9, IMAGE10].filter(Boolean);

    return {
        title: TITLE,
        description: DESCRIPTION,
        price: parseFloat(PRICE) || 0,
        currency: CURRENCY_CODE,
        quantity: parseInt(QUANTITY, 10) || 0,
        tags: TAGS ? TAGS.split(",") : [],
        materials: MATERIALS ? MATERIALS.split(",") : [],
        images,
        variations: [
            VARIATION_1_TYPE && VARIATION_1_NAME && VARIATION_1_VALUES
                ? { type: VARIATION_1_TYPE, name: VARIATION_1_NAME, values: VARIATION_1_VALUES.split(",") }
                : null,
            VARIATION_2_TYPE && VARIATION_2_NAME && VARIATION_2_VALUES
                ? { type: VARIATION_2_TYPE, name: VARIATION_2_NAME, values: VARIATION_2_VALUES.split(",") }
                : null
        ].filter(Boolean),
        etsyId
    };
};
// 🔥 Function to Update Firebase with Etsy Data
const updateEtsyDataInFirebase = async (etsyProducts: any[]) => {
    for (const etsyProduct of etsyProducts) {
        const { SKU } = etsyProduct;
        if (!SKU) {
            console.warn("❌ Missing SKU, skipping:", etsyProduct);
            continue;
        }

        const productRef = doc(db, "products", SKU);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            console.warn(`❌ Product with SKU ${SKU} not found in Firebase`);
            continue;
        }

        const formattedData = formatEtsyData(etsyProduct);
        console.log(`📌 Updating product ${SKU} with Etsy data:`, formattedData);
        try {
            await updateDoc(productRef, {
                etsy: formattedData,
                etsyId: "", // ✅ Placeholder Etsy ID
            });
            console.log(`✅ Updated product ${SKU} with Etsy data`);
        } catch (error) {
            console.error(`❌ Error updating SKU ${SKU}:`, error);
        }
    }
};

const UploadFonts = () => {
    const [loading, setLoading] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);

    // ✅ Upload Embroidery Fonts to Firestore

    const uploadEmbroideryFonts = async () => {
        setLoading(true);

        try {
            console.log("🚀 Starting embroidery fonts upload...");

            for (const font of embroideryFonts) {
                const fontDocRef = doc(db, "products", font.sku); // Store under "products" directly

                console.log(`📌 Preparing to upload: ${font.sku} - ${font.name}`);

                await setDoc(fontDocRef, {
                    ...font,
                });

                console.log(`✅ Uploaded: ${font.sku} - ${font.name}`);
            }

            console.log("🔥 All embroidery fonts uploaded successfully!");
            alert("All embroidery fonts uploaded successfully!");
        } catch (error) {
            if (error instanceof Error) {
                console.error("❌ Error uploading embroidery fonts:", error.message);
                console.error("Error stack:", error.stack);
            } else {
                console.error("❌ Error uploading embroidery fonts:", error);
            }
            alert(`Error uploading embroidery fonts: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const uploadFonts = async () => {
        setLoading(true);

        try {
            console.log("🚀 Starting fonts upload...");

            for (const font of fonts) {
                const fontDocRef = doc(db, "products", font.sku); // Store under "products" directly

                console.log(`📌 Preparing to upload: ${font.sku} - ${font.name}`);

                await setDoc(fontDocRef, {
                    ...font,
                });

                console.log(`✅ Uploaded: ${font.sku} - ${font.name}`);
            }

            console.log("🔥 All embroidery fonts uploaded successfully!");
            alert("All embroidery fonts uploaded successfully!");
        } catch (error) {
            if (error instanceof Error) {
                console.error("❌ Error uploading embroidery fonts:", error.message);
                console.error("Error stack:", error.stack);
            } else {
                console.error("❌ Error uploading embroidery fonts:", error);
            }
            alert(`Error uploading embroidery fonts: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            setCsvFile(event.target.files[0]);
        }
    };


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
                console.log("✅ Parsed CSV Data:", results.data);
                await updateEtsyDataInFirebase(results.data);
                console.log("Etsy Data Updated in Firebase!");
                setLoading(false);
            },
            error: (error) => {
                console.error("❌ Error parsing CSV:", error);
                console.log("Error parsing CSV!");
                setLoading(false);
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
            <h2 className="text-lg font-semibold mb-2">🔄 Sync WordPress IDs to Products</h2>
            <p className="text-sm text-gray-600 mb-4">
                This will update all products with their associated WordPress IDs from WooCommerce.
            </p>
            <Button
                variant="twoTone"
                onClick={async () => {
                    setLoading(true)
                    try {
                        await updateFirestoreWithWooCommerceIds()
                        toast.push(
                            <Notification title="✅ Sync Complete" type="success">
                                WordPress IDs have been updated in Firestore.
                            </Notification>,
                            { placement: 'top-center' }
                        )
                    } catch (err) {
                        toast.push(
                            <Notification title="❌ Sync Failed" type="danger">
                                An error occurred while updating WordPress IDs.
                            </Notification>,
                            { placement: 'top-center' }
                        )
                    } finally {
                        setLoading(false)
                    }
                }}
                loading={loading}
            >
                {loading ? "Syncing WordPress IDs..." : "Sync Now"}
            </Button>
        </Card>

    );
};

export default UploadFonts;