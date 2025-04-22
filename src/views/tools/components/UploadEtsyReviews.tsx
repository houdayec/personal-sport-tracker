import { useState } from "react";
import { collection, addDoc, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "@/firebase"; // Ensure Firebase is initialized
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Notification from "@/components/ui/Notification";
import toast from "@/components/ui/toast";
import MurmurHash3 from "imurmurhash";
import { HiOutlineStar } from "react-icons/hi";
import { Card, Upload } from "@/components/ui";
import { showToast } from "@/utils/toastUtils";
import { EtsyReview } from "@/@types/etsy_review";

const UploadEtsyReviews = () => {
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // Handle uploaded file and validate that it's a proper reviews.json file
    const handleFileUpload = (files: File[], fileList: File[]) => {
        const file = files?.[0];

        if (!file) return;

        const isValid = /^reviews(\s\(\d+\))?\.json$/.test(file.name);

        if (!isValid) {
            showToast({
                type: 'danger',
                title: "Invalid file name. Use 'reviews.json' or its downloaded version.",
            })
            setJsonFile(null);
            return;
        }

        setJsonFile(file);
    };


    // Parse uploaded Etsy reviews JSON and add to Firestore if not duplicate
    const handleParseJSON = async () => {
        if (!jsonFile) return;

        setLoading(true);
        try {
            const text = await jsonFile.text();
            const reviews = JSON.parse(text);

            if (!Array.isArray(reviews)) {
                showToast({
                    type: 'danger',
                    title: "Invalid JSON format!",
                })
                setLoading(false);
                return;
            }

            // ✅ Fetch existing review IDs from index chunks
            const indexCollectionRef = collection(db, "etsy_reviews_indexes");
            const existingIndexDocs = await getDocs(indexCollectionRef);

            const existingReviewIds = new Set<string>();
            existingIndexDocs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.reviewIds && Array.isArray(data.reviewIds)) {
                    data.reviewIds.forEach((id: string) => existingReviewIds.add(id));
                }
            });

            let uploadedCount = 0;
            const batchUploads = [];
            const newReviewIds: string[] = [];

            for (const review of reviews) {
                const input = `${review.orderId}_${review.reviewer}_${review.dateReviewed}_${review.message}`;
                const uniqueReviewId = Math.abs(MurmurHash3(input).result()).toString();

                if (existingReviewIds.has(uniqueReviewId)) {
                    console.log(`⚠️ Skipping duplicate review from ${review.reviewer} for Order ${review.order_id}`);
                    continue;
                }

                // Use class constructor or static factory method
                const reviewInstance = new EtsyReview({
                    id: uniqueReviewId,
                    orderId: String(review.order_id),
                    reviewer: review.reviewer || "Anonymous",
                    message: review.message || "",
                    starRating: review.star_rating || 5,
                    dateReviewed: review.date_reviewed ? new Date(review.date_reviewed).getTime() : Date.now(),
                    syncWithWordPress: false,
                    treated: false, // default
                });

                const reviewRef = doc(db, "etsy_reviews", uniqueReviewId);
                batchUploads.push(setDoc(reviewRef, reviewInstance.toPlain())); // assuming toPlain() or toFirestore() returns a plain object
                newReviewIds.push(uniqueReviewId);
                uploadedCount++;
            }


            // ✅ Execute uploads
            await Promise.all(batchUploads);

            // ✅ Merge and chunk new + existing IDs
            const combinedReviewIds = Array.from(new Set([...existingReviewIds, ...newReviewIds]));
            const chunkSize = 50000;
            const chunks = [];

            for (let i = 0; i < combinedReviewIds.length; i += chunkSize) {
                chunks.push(combinedReviewIds.slice(i, i + chunkSize));
            }

            for (let i = 0; i < chunks.length; i++) {
                const indexId = `index_${i}`;
                await setDoc(doc(db, "etsy_reviews_indexes", indexId), {
                    reviewIds: chunks[i],
                    createdAt: Date.now(),
                });
            }

            showToast({
                type: 'success',
                title: `Uploaded ${uploadedCount} new Etsy reviews!`,
            })

        } catch (error) {
            console.error("❌ Error parsing/uploading Etsy reviews:", error);
            showToast({
                type: 'danger',
                title: 'Error parsing CSV.',
                message: `${error}`,
            })
        }

        setLoading(false);
        setJsonFile(null);
    };


    return (
        <Card className="bg-white">
            <div className="flex items-center mb-4">
                <HiOutlineStar className="text-xl text-yellow-500 mr-2" />
                <h2 className="text-lg font-semibold">Upload Etsy Reviews</h2>
            </div>            <p className="text-md mb-4">Select a <strong>reviews.json</strong> file to upload reviews to Firestore.</p>
            <Upload draggable accept=".json" onChange={handleFileUpload} />
            <Button variant="twoTone" onClick={handleParseJSON} loading={loading} disabled={!jsonFile}>
                Upload Reviews
            </Button>
        </Card>
    );
};

export default UploadEtsyReviews;
