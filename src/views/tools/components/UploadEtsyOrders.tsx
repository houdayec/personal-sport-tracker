import { useState } from "react";
import { collection, addDoc, getDocs, setDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase"; // Ensure Firebase is initialized
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/toast";
import MurmurHash3 from "imurmurhash";
import Papa from "papaparse";
import Notification from '@/components/ui/Notification'
import { HiOutlineDocumentAdd } from "react-icons/hi";
import { Alert, Card, Upload } from "@/components/ui";
import { showToast } from "@/utils/toastUtils";

const UploadEtsyOrders = () => {
    const [csvFileEtsyOrders, setCsvFileEtsyOrders] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [parsedOrders, setParsedOrders] = useState<any[]>([]);

    const handleEtsyOrdersFileUpload = (files: File[], fileList: File[]) => {
        const file = files?.[0];
        if (!file) return;

        const fileName = file.name;
        const isCSV = file.type === "text/csv" || fileName.endsWith(".csv");

        // Match: EtsySoldOrders followed by 4 digits and optional extra (e.g., (1))
        const isCorrectName = /^EtsySoldOrders20\d{2}(\s\(\d+\))?\.csv$/i.test(fileName);

        if (!isCSV || !isCorrectName) {
            showToast({
                type: 'danger',
                title: 'Invalid file',
                message: 'Please upload a valid EtsySoldOrders CSV file named like EtsySoldOrders2025.csv',
            })
            setCsvFileEtsyOrders(null);
            return;
        } else {
            setCsvFileEtsyOrders(file);

        }

    };

    const storeOrderIdsToIndex = async () => {
        const ordersRef = collection(db, "etsy_orders");
        const snapshot = await getDocs(ordersRef);

        const allOrderIds: string[] = snapshot.docs.map(doc => doc.id);
        const chunkSize = 50000;

        for (let i = 0; i < allOrderIds.length; i += chunkSize) {
            const chunk = allOrderIds.slice(i, i + chunkSize);
            const index = Math.floor(i / chunkSize);

            await setDoc(doc(db, "etsy_orders_indexes", index.toString()), {
                index,
                ids: chunk,
                updatedAt: Date.now()
            });

            console.log(`✅ Saved chunk index ${index} with ${chunk.length} order IDs`);
        }

        console.log("✅ All order IDs have been indexed.");
    };

    const fetchIndexedOrderIds = async (): Promise<Set<string>> => {
        const indexSnap = await getDocs(collection(db, "etsy_orders_indexes"));
        const allIds: string[] = [];

        indexSnap.forEach((doc) => {
            const ids: string[] = doc.data().orderIds || [];
            allIds.push(...ids);
        });

        return new Set(allIds);
    };

    const handleUploadEtsyOrders = () => {
        if (!csvFileEtsyOrders) return;
        setLoading(true);

        Papa.parse(csvFileEtsyOrders, {
            header: true,
            skipEmptyLines: true,
            complete: async (result) => {
                const existingOrderIds = await fetchIndexedOrderIds();
                let uploadedCount = 0;
                const newOrderIds: string[] = [];

                const uploadPromises = result.data.map(async (order: any) => {
                    const orderId = order["Order ID"] || `ETSY-${Date.now()}`;

                    if (!existingOrderIds.has(orderId)) {
                        // 🔄 Handle multiple SKUs as separate products
                        const skuList = (order["SKU"] || "")
                            .split(",")
                            .map((s: string) => s.trim())
                            .filter(Boolean);
                        const quantity = parseInt(order["Number of Items"]) || skuList.length || 1;
                        const unitPrice = (parseFloat(order["Order Value"]) || 0) / quantity;

                        const newOrder = {
                            orderId,
                            buyer: {
                                name: order["Full Name"] || `${order["First Name"]} ${order["Last Name"]}` || "Unknown",
                                username: order["Buyer User ID"] || "Unknown",
                            },
                            email: order["Buyer Email"] || "",
                            orderDetails: {
                                orderType: order["Order Type"] || "unknown",
                                orderTotal: parseFloat(order["Order Total"]) || 0,
                                orderNet: parseFloat(order["Order Net"]) || 0,
                                orderValue: parseFloat(order["Order Value"]) || 0,
                                currency: order["Currency"] || "USD",
                                saleDate: order["Sale Date"] ? new Date(order["Sale Date"]).getTime() : Date.now(),
                                status: order["Status"] || "pending",
                            },
                            payment: {
                                method: order["Payment Method"] || "unknown",
                                type: order["Payment Type"] || "unknown",
                                fees: parseFloat(order["Card Processing Fees"]) || 0,
                                adjustedFees: parseFloat(order["Adjusted Card Processing Fees"]) || 0,
                            },
                            discount: {
                                couponCode: order["Coupon Code"] || null,
                                details: order["Coupon Details"] || null,
                                discountAmount: parseFloat(order["Discount Amount"]) || 0,
                                inPersonDiscount: order["InPerson Discount"] || null,
                            },
                            tax: {
                                salesTax: parseFloat(order["Sales Tax"]) || 0,
                            },
                            shipping: {
                                shippingCost: parseFloat(order["Shipping"]) || 0,
                                shippingDiscount: parseFloat(order["Shipping Discount"]) || 0,
                                dateShipped: order["Date Shipped"] ? new Date(order["Date Shipped"]).getTime() : Date.now(),
                                address: {
                                    name: order["Full Name"] || "Unknown",
                                    street1: order["Street 1"] || "",
                                    street2: order["Street 2"] || "",
                                    city: order["Ship City"] || "",
                                    state: order["Ship State"] || "",
                                    country: order["Ship Country"] || "",
                                    zipcode: order["Ship Zipcode"] || "",
                                },
                            },
                            products: skuList.map((sku: string, index: number) => ({
                                productName: "Unknown Product",
                                sku,
                                price: unitPrice,
                                quantity: 1,
                            })),
                            etsyStatus: "pending",
                            isFollowupDone: false,
                        };

                        await setDoc(doc(db, "etsy_orders", orderId), newOrder);
                        newOrderIds.push(orderId);
                        uploadedCount++;
                    }
                });

                await Promise.all(uploadPromises);

                if (newOrderIds.length > 0) {
                    const indexCollectionRef = collection(db, "etsy_orders_indexes");
                    const existingIndexDocs = await getDocs(indexCollectionRef);

                    let allIds: string[] = [];

                    existingIndexDocs.forEach(docSnap => {
                        const data = docSnap.data();
                        if (data.orderIds && Array.isArray(data.orderIds)) {
                            allIds = allIds.concat(data.orderIds);
                        }
                    });

                    const combinedIds = Array.from(new Set([...allIds, ...newOrderIds]));
                    const chunkSize = 50000;
                    const chunks = [];

                    for (let i = 0; i < combinedIds.length; i += chunkSize) {
                        chunks.push(combinedIds.slice(i, i + chunkSize));
                    }

                    for (let i = 0; i < chunks.length; i++) {
                        const indexId = `index_${i}`;
                        await setDoc(doc(db, "etsy_orders_indexes", indexId), {
                            orderIds: chunks[i],
                            createdAt: Date.now(),
                        });
                    }
                }

                showToast({
                    type: 'success',
                    title: 'Upload Complete',
                    message: `${uploadedCount} order${uploadedCount !== 1 ? 's' : ''} uploaded successfully.`,
                });

                setCsvFileEtsyOrders(null);
                setLoading(false);
            },
            error: (error) => {
                console.error("❌ CSV Parsing Error:", error);
                showToast({
                    type: 'danger',
                    title: 'Error parsing CSV.',
                    message: `${error.message}`,
                });
                setLoading(false);
            }
        });

    };

    return (
        <Card className="bg-white">
            <div className="flex items-center mb-4">
                <HiOutlineDocumentAdd className="text-xl text-indigo-600 mr-2" />
                <h2 className="text-lg font-semibold">Upload Etsy Orders</h2>
            </div>
            <p className="text-md mb-4">Get <strong>EtsySoldOrders.csv</strong> from Etsy Download Page</p>
            <Upload draggable accept=".csv" onChange={handleEtsyOrdersFileUpload} />
            <Button variant="twoTone" onClick={handleUploadEtsyOrders} loading={loading} disabled={!csvFileEtsyOrders}>
                Upload Orders
            </Button>
        </Card>
    );
};

export default UploadEtsyOrders;
