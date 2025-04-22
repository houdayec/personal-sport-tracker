import { Button, Card } from "@/components/ui";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

const FetchProductStructureButton = () => {
    const handleClick = async () => {
        try {
            const snapshot = await getDocs(collection(db, "products"));
            const firstDoc = snapshot.docs[0];

            if (firstDoc) {
                console.log("📦 Product structure:", {
                    id: firstDoc.id,
                    ...firstDoc.data(),
                });
            } else {
                console.log("⚠️ No products found in Firestore.");
            }
        } catch (error) {
            console.error("❌ Failed to fetch product structure:", error);
        }
    };

    return (
        <Card className="bg-white">
            <h2 className="text-lg font-semibold mb-2">🐛 Debug Database</h2>
            <p className="text-sm text-gray-600 mb-4">
                This will update all products with their associated WordPress IDs from WooCommerce.
            </p>
            <Button onClick={handleClick}>
                Get Product Structure
            </Button>
        </Card>
    );
};

export default FetchProductStructureButton;
