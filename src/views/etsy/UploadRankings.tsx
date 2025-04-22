import { useState } from "react";
import { collection, setDoc, doc } from "firebase/firestore";
import { db } from "@/firebase"; // Assuming firebase is initialized here
import { Upload } from "@/components/ui"; // Assuming this is the Elstar Upload component
import { Button } from "@/components/ui/Button"; // Assuming the Button component is available
import { showToast } from "@/utils/toastUtils";
import Papa from "papaparse";
import { Card } from "@/components/ui/Card";
import { HiOutlineDocumentAdd } from "react-icons/hi";
import { SearchQuery } from "@/shared/search_query";

const UploadRankings = () => {
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJsonFileUpload = (files: File[], fileList: File[]) => {
        const file = files[0];
        if (!file) return;

        const isJson = file.type === "application/json" || file.name.endsWith(".json");
        if (!isJson) {
            showToast({
                type: 'danger',
                title: 'Invalid file',
                message: 'Please upload a valid JSON file.',
            });
            setJsonFile(null);
            return;
        }

        setJsonFile(file);
    };

    // Function to handle uploading the rankings data
    const handleUploadRankings = async () => {
        if (!jsonFile) return;
        setLoading(true);
        setError(null); // Reset any previous error state

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const fileContent = reader.result as string;
                const data: Record<string, SearchQuery> = JSON.parse(fileContent);

                if (Object.keys(data).length === 0) {
                    throw new Error("The JSON file is empty.");
                }

                await uploadRankingsToFirestore(data);
            } catch (err: any) {
                setError(`Error processing file: ${err.message}`);
                setLoading(false);
                showToast({
                    type: 'danger',
                    title: 'Upload Error',
                    message: `Failed to upload rankings: ${err.message}`,
                });
                console.error("Upload Error:", err);
            }
        };

        reader.onerror = (err) => {
            setError('Error reading the file.');
            setLoading(false);
            showToast({
                type: 'danger',
                title: 'File Read Error',
                message: 'Failed to read the file.',
            });
            console.error('File Read Error:', err);
        };

        reader.readAsText(jsonFile);
    };

    const uploadRankingsToFirestore = async (data: Record<string, SearchQuery>) => {
        const now = Date.now();

        for (const slug in data) {
            const query = data[slug];
            const queryRef = doc(db, "search_queries", slug);

            try {
                // Save or update the base query document
                await setDoc(queryRef, {
                    id: query.id,
                    query: query.query,
                    createdAt: query.createdAt || now,
                    updatedAt: now,
                    latestSnapshotDate: query.history[query.history.length - 1]?.date || now, // Store the latest snapshot date
                    historyPages: [], // Placeholder for now, will be populated after pagination
                    currentRanks: query.currentRanks,
                }, { merge: true });

                // Paginate and store snapshots in pages (limit to 50 snapshots per page)
                const pageSize = 100;
                const totalHistory = query.history.length;
                const totalPages = Math.ceil(totalHistory / pageSize);

                const historyPageRefs = [];
                for (let page = 0; page < totalPages; page++) {
                    const pageHistory = query.history.slice(page * pageSize, (page + 1) * pageSize);
                    const pageRef = doc(collection(queryRef, "historyPages"), `page-${page + 1}`);

                    await setDoc(pageRef, {
                        snapshots: pageHistory
                    });

                    historyPageRefs.push(pageRef);  // Add the reference to the historyPages array
                }

                // Now update the main query document with references to the paginated history pages
                await setDoc(queryRef, { historyPages: historyPageRefs }, { merge: true });

                console.log(`✅ Uploaded "${query.query}" with ${historyPageRefs.length} history page(s)`);

            } catch (err: any) {
                console.error("Error uploading to Firestore:", err);
                showToast({
                    type: 'danger',
                    title: 'Firestore Upload Error',
                    message: `Failed to upload rankings for "${query.query}".`,
                });
                break; // Stop further uploads if error occurs
            }
        }

        showToast({
            type: 'success',
            title: 'Rankings Uploaded!',
        });
        setLoading(false);
    };


    // Upload rankings data to Firestore
    const uploadRankingsToFirestore2 = async (data: Record<string, SearchQuery>) => {
        const now = Date.now();

        for (const slug in data) {
            const query = data[slug];
            const queryRef = doc(db, "search_queries", slug);

            try {
                // Save or update the base query document
                await setDoc(queryRef, {
                    id: query.id,
                    query: query.query,
                    createdAt: query.createdAt || now,
                    updatedAt: now,
                }, { merge: true });

                // Upload each snapshot in the query's history
                for (const snapshot of query.history || []) {
                    const snapshotId = new Date(snapshot.date || now).toISOString().split('T')[0];
                    const snapshotRef = doc(collection(queryRef, "results"), snapshotId);

                    await setDoc(snapshotRef, {
                        date: snapshot.date || now,
                        listings: snapshot.listings,
                    });
                }

                console.log(`✅ Uploaded "${query.query}" with ${query.history?.length || 0} snapshot(s)`);
            } catch (err: any) {
                setError(`Failed to upload query "${query.query}": ${err.message}`);
                console.error("Error uploading to Firestore:", err);
                showToast({
                    type: 'danger',
                    title: 'Firestore Upload Error',
                    message: `Failed to upload rankings for "${query.query}".`,
                });
                break; // Stop further uploads if error occurs
            }
        }
        showToast({
            type: 'success',
            title: 'Rankings Uploaded!',
        });
        setLoading(false);
    };

    return (
        <Card className="bg-white">
            <div className="flex items-center mb-4">
                <HiOutlineDocumentAdd className="text-xl text-indigo-600 mr-2" />
                <h2 className="text-lg font-semibold">Upload rankings.json</h2>
            </div>
            <p className="text-md mb-4">Upload your rankings JSON file here:</p>

            {/* Display Error Message if any */}
            {error && (
                <div className="mb-4 text-red-600 font-semibold">{error}</div>
            )}

            <Upload draggable accept=".json" onChange={handleJsonFileUpload} />
            <Button
                variant="twoTone"
                onClick={handleUploadRankings}
                loading={loading}
                disabled={!jsonFile || loading}
            >
                Upload Rankings
            </Button>
        </Card>
    );
};

export default UploadRankings;
