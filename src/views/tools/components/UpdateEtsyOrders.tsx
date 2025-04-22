import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from "@/firebase"; // Ensure Firebase is initialized
import Button from '@/components/ui/Button';

const UpdateOrdersWithProduct = () => {
    // 🔁 Trigger to update all orders with known products
    const updateOrders = async () => {
        console.log("🔄 Starting update of orders...");

        const snapshot = await getDocs(collection(db, 'etsy_orders'));
        let updated = 0;

        for (const docSnap of snapshot.docs) {
            const order = docSnap.data();
            let modified = false;

            const updatedProducts = order.products.map((product: any) => {
                // ⚠️ Replace this check with your actual match logic (e.g. SKU match)
                if (product.sku) {
                    // 🔧 Simulated logic (e.g. attach correspondingProduct or update price)
                    product.updatedAt = Date.now(); // Add/modify as needed
                    modified = true;
                }
                return product;
            });

            if (modified) {
                await setDoc(doc(db, 'etsy_orders', order.orderId), {
                    ...order,
                    products: updatedProducts,
                });
                updated++;
                console.log(`✅ Updated order: ${order.orderId}`);
            }
        }

        console.log(`🎉 Done. ${updated} orders updated.`);
    };

    return (
        <Button onClick={updateOrders} variant="solid">
            Update All Orders with Matching Product
        </Button>
    );
};

export default UpdateOrdersWithProduct;
