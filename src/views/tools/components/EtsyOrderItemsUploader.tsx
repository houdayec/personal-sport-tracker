import React, { useState } from "react";
import Papa from "papaparse";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "@/firebase"; // Ensure Firebase is imported
import { Button, Card, Input, toast, Upload } from "@/components/ui";
import Notification from '@/components/ui/Notification'
import { HiOutlineClipboardList, HiOutlineDocumentAdd } from "react-icons/hi";
import { showToast } from "@/utils/toastUtils";

const UploadEtsyOrderItems: React.FC = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // ✅ Handle File Upload Selection
    // Handle file upload for Etsy Sold Order Items, validate filename with any year
    const handleFileUpload = (files: File[], fileList: File[]) => {
        const file = files?.[0];

        if (!file) return;

        const isValid = /^EtsySoldOrderItems\d{4}(\s\(\d+\))?\.csv$/.test(file.name);

        if (!isValid) {
            showToast({
                type: 'danger',
                title: 'Invalid File',
                message: "Please upload a valid EtsySoldOrderItems CSV file named like EtsySoldOrderItems2025.csv",
            })
            setCsvFile(null);
            return;
        }

        setCsvFile(file);
    };


    // ✅ Parse CSV & Upload to Firestore
    const handleParseCSV = async () => {
        if (!csvFile) return;
        setLoading(true);

        try {
            console.log("🔍 Fetching existing indexed order item IDs...");

            // ✅ Fetch existing order item IDs from index chunks
            const indexCollectionRef = collection(db, "etsy_orders_items_indexes");
            const existingIndexDocs = await getDocs(indexCollectionRef);

            const existingItemIds = new Set<string>();
            existingIndexDocs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.itemIds && Array.isArray(data.itemIds)) {
                    data.itemIds.forEach((id: string) => existingItemIds.add(id));
                }
            });

            console.log(`📦 Found ${existingItemIds.size} existing order items.`);

            // ✅ Read CSV File as Text
            const text = await csvFile.text();

            // ✅ Wrap Papa.parse inside a Promise to ensure it awaits
            const parsedItems: any[] = await new Promise((resolve, reject) => {
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (result) => resolve(result.data),
                    error: () => reject(),
                });
            });

            // ✅ Map CSV Data to Firestore Schema
            const formattedItems = parsedItems.map((item: any) => ({
                orderId: item["Order ID"] || `ETSY-${Date.now()}`,
                transactionId: item["Transaction ID"] || `TRANS-${Date.now()}`,
                saleDate: new Date(item["Sale Date"]).getTime(), // Convert to timestamp
                itemName: item["Item Name"] || "Unknown Item",
                buyer: item["Buyer"] || "Unknown",
                quantity: parseInt(item["Quantity"]) || 1,
                price: parseFloat(item["Price"]) || 0,
                currency: item["Currency"] || "USD",
                couponCode: item["Coupon Code"] || "",
                couponDetails: item["Coupon Details"] || "",
                discountAmount: parseFloat(item["Discount Amount"]) || 0,
                shippingDiscount: parseFloat(item["Shipping Discount"]) || 0,
                orderShipping: parseFloat(item["Order Shipping"]) || 0,
                orderSalesTax: parseFloat(item["Order Sales Tax"]) || 0,
                itemTotal: parseFloat(item["Item Total"]) || 0,
                listingId: item["Listing ID"] || "N/A",
                datePaid: item["Date Paid"] ? new Date(item["Date Paid"]).getTime() : null,
                dateShipped: item["Date Shipped"] ? new Date(item["Date Shipped"]).getTime() : null,
                paymentType: item["Payment Type"] || "Unknown",
                orderType: item["Order Type"] || "Unknown",
                listingType: item["Listings Type"] || "Unknown",
                shippingAddress: {
                    name: item["Ship Name"] || "",
                    address1: item["Ship Address1"] || "",
                    address2: item["Ship Address2"] || "",
                    city: item["Ship City"] || "",
                    state: item["Ship State"] || "",
                    zipcode: item["Ship Zipcode"] || "",
                    country: item["Ship Country"] || "",
                },
                vatPaidByBuyer: parseFloat(item["VAT Paid by Buyer"]) || 0,
                inPersonDiscount: item["InPerson Discount"] || "",
                inPersonLocation: item["InPerson Location"] || "",
                sku: item["SKU"] || "N/A",
            }));

            console.log(`📋 Parsed ${formattedItems.length} order items from CSV.`);

            // ✅ Upload Data to Firestore Only If Not Exists
            let uploadedCount = 0;
            let skippedCount = 0;
            const newItemIds: string[] = [];

            const uploadPromises = formattedItems.map(async (orderItem) => {
                const docId = `${orderItem.orderId}-${orderItem.transactionId}`;
                if (!existingItemIds.has(docId)) {
                    await setDoc(doc(db, "etsy_orders_items", docId), orderItem);
                    newItemIds.push(docId);
                    uploadedCount++;
                } else {
                    skippedCount++;
                }
            });

            await Promise.all(uploadPromises); // ✅ Ensure all uploads finish

            // ✅ Merge & index updated list
            const combinedItemIds = Array.from(new Set([...existingItemIds, ...newItemIds]));
            const chunkSize = 30000;
            const chunks = [];

            for (let i = 0; i < combinedItemIds.length; i += chunkSize) {
                chunks.push(combinedItemIds.slice(i, i + chunkSize));
            }

            for (let i = 0; i < chunks.length; i++) {
                const indexId = `index_${i}`;
                await setDoc(doc(db, "etsy_orders_items_indexes", indexId), {
                    itemIds: chunks[i],
                    updatedAt: Date.now(),
                });
            }
            showToast({
                type: 'success',
                title: 'Upload Successful',
                message: `${uploadedCount} order${uploadedCount !== 1 ? 's' : ''} item${uploadedCount !== 1 ? 's' : ''} uploaded successfully.`
            })
            setLoading(false);

            console.log(`✅ Successfully uploaded ${uploadedCount} new order items.`);
            console.log(`⚠️ Skipped ${skippedCount} existing order items.`);
        } catch (error) {
            console.error("❌ Error uploading Etsy Order Items:", error);
            showToast({
                type: 'danger',
                title: 'Error parsing CSV.',
                message: `${error}`,
            })
            setLoading(false);
        }

        setCsvFile(null);

    };

    return (
        <Card className="bg-white">
            <div className="flex items-center mb-4">
                <HiOutlineClipboardList className="text-xl text-amber-500 mr-2" />
                <h2 className="text-lg font-semibold">Upload Etsy Order Items</h2>
            </div>            <p className="text-md mb-4">Get <strong>EtsyOrderItems.csv</strong> from Etsy Download Page</p>
            <Upload draggable accept=".csv" onChange={handleFileUpload} />
            <Button variant="twoTone" onClick={handleParseCSV} loading={loading} disabled={!csvFile}>
                Upload Order Items
            </Button>
        </Card>
    );
};

export default UploadEtsyOrderItems;
