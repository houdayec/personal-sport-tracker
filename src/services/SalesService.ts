import { TableQueries } from '@/@types/common'
import ApiService from './ApiService'
import WordpressApiService from './WordpressService'
import { SalesOrderDetailsResponse } from '@/views/website/OrderDetails/OrderDetails'
import { collection, CollectionReference, doc, DocumentData, getDoc, getDocs, getDocsFromCache, limit, orderBy, query, QueryConstraint, QueryFieldFilterConstraint, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/firebase'
import { ProductFilterQueries } from '@/views/products/ProductList/store/productListSlice'
import { Product } from '@/@types/product'
import { filter } from 'lodash'
import { table } from 'console'
import { DashboardData, DashboardQuery } from '@/views/etsy/EtsyStats/store'
import { EtsyOrder, EtsyOrderItem } from '@/@types/etsy_order'
import { WooOrder } from '@/@types/woo_order'
import { convertToUSD } from '@/utils/currency'


const TWO_MONTHS_AGO = Date.now() - 60 * 24 * 60 * 60 * 1000; // ✅ 60 days in milliseconds

export async function apiGetProductsThatNeedReview<T, U extends TableQueries & { filterData?: ProductFilterQueries }>(
    params: U
) {
    try {
        const productsRef = collection(db, "products");
        const filters: QueryConstraint[] = [];

        console.log("Filters:", params.filterData);
        console.log("Params:", params);

        // ✅ Filter: Products that are published on website
        filters.push(where("publishedOnWebsite", "==", true));

        // ✅ Filter: Products that haven't been updated for more than 2 months
        filters.push(where("wordpressReviewUpdatedAt", "<=", TWO_MONTHS_AGO));

        // ✅ Apply Category Filter (Font / Embroidery Font)
        if (params.filterData?.category?.length) {
            console.log("Applying category filter:", params.filterData.category);
            filters.push(where("category", "in", params.filterData.category));
        }

        // ✅ Apply Name Search (Case-Insensitive Starts With)
        if (params.filterData?.name?.trim()) {
            console.log("Applying name filter:", params.filterData.name);
            filters.push(where("name", ">=", params.filterData.name.trim()));
            filters.push(where("name", "<=", params.filterData.name.trim() + "\uf8ff"));
        }

        // ✅ Apply Filters to Query
        const productQuery = query(productsRef, ...filters);
        console.log("Firestore Query:", productQuery);

        // ✅ Fetch Data
        const productsSnapshot = await getDocs(productQuery);

        // ✅ Process products and classify them based on category
        const products = productsSnapshot.docs
            .map((doc) => {
                const data = doc.data()
                const product = Product.fromFirestore(doc.id, data)

                if (product.category === 'font' || product.category === 'football_font') {
                    return product
                } else {
                    console.warn('❌ Unknown product category:', product.category, 'for SKU:', doc.id)
                    return null
                }
            })
            .filter((p): p is Product => p !== null)


        // ✅ Ensure safe pagination defaults
        const pageIndex = params.pageIndex ?? 1;
        const pageSize = params.pageSize ?? 10;

        return {
            data: products.slice((pageIndex - 1) * pageSize, pageIndex * pageSize), // ✅ Apply pagination
            total: products.length, // ✅ Return total count
        };
    } catch (error) {
        console.error("❌ Error fetching products from Firebase:", error);
        throw new Error("Failed to fetch products");
    }
}

export async function apiDeleteSalesProducts<
    T,
    U extends Record<string, unknown>,
>(data: U) {
    return ApiService.fetchData<T>({
        url: '/sales/products/delete',
        method: 'delete',
        data,
    })
}

export async function apiGetProduct<T, U extends { id: string }>(params: U): Promise<{ data: Product }> {
    const docRef = doc(db, "products", params.id)
    const snap = await getDoc(docRef)
    var product = new Product({})
    if (!snap.exists()) {
        console.log(`Product with ID ${params.id} not found`)
        throw new Error(`Product with ID ${params.id} not found`)
    } else {
        console.log(`Product with ID ${params.id} found`)
        product = Product.fromFirestore(snap.id, snap.data())
    }

    return { data: product } // return in same shape as API response
}

/*export async function apiGetRandomProducts(params: { category: string, limit: number }): Promise<{ data: Product[] }> {
    const q = query(collection(db, "products"), where("category", "==", params.category))
    const snapshot = await getDocs(q)

    const allProducts: Product[] = []
    snapshot.forEach((doc) => {
        const product = Product.fromFirestore(doc.id, doc.data())
        allProducts.push(product)
    })

    // Filter out products without a valid etsyId
    const filtered = allProducts.filter(p => !!p.etsyId)

    // Shuffle and slice to get random selection
    const shuffled = filtered.sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, params.limit)

    return { data: selected }
}*/

export async function apiGetProducts<T, U extends TableQueries & { filterData?: ProductFilterQueries }>(
    params: U,
) {
    const {
        pageIndex = 1,
        pageSize = 50,
        query: searchQuery,
        filterData,
        sort = { key: 'sku', order: 'desc' },
    } = params;

    const productsRef = collection(db, "products");
    console.log(params);
    let allProducts: Product[] = [];

    if (searchQuery) {
        const skuQuery = query(productsRef, where("sku", "==", searchQuery.toUpperCase()));
        const skuSnapshot = await getDocs(skuQuery);

        if (!skuSnapshot.empty) {
            allProducts = skuSnapshot.docs.map(doc => Product.fromFirestore(doc.id, doc.data()));
        } else {
            const allSnapshot = await getDocs(productsRef);
            const nameFilteredDocs = allSnapshot.docs.filter(doc =>
                doc.data().name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            allProducts = nameFilteredDocs.map(doc => Product.fromFirestore(doc.id, doc.data()));
        }
    } else {
        const conditions: any[] = [];

        if (filterData?.category && filterData.category.length === 1) {
            conditions.push(where("category", "==", filterData.category[0]));
        }

        if (filterData?.etsyPublished !== undefined) {
            conditions.push(where("publishedOnEtsy", "==", filterData.etsyPublished));
        }

        if (filterData?.websitePublished !== undefined) {
            conditions.push(where("publishedOnWebsite", "==", filterData.websitePublished));
        }

        let q = query(productsRef, ...conditions);
        const snapshot = await getDocs(q);
        allProducts = snapshot.docs.map(doc => Product.fromFirestore(doc.id, doc.data()));

        if (filterData?.category && filterData.category.length > 1) {
            allProducts = allProducts.filter(p => filterData.category?.includes(p.category));
        }
    }

    // Apply sorting locally
    let { key = 'sku', order = 'desc' } = sort || {}

    if (!key) key = 'sku'
    if (!order) order = 'desc'

    allProducts.sort((a, b) => {
        const aVal = (a as any)[key];
        const bVal = (b as any)[key];

        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });


    const start = (pageIndex - 1) * pageSize;
    const paginated = allProducts.slice(start, start + pageSize);

    return {
        data: paginated,
        total: allProducts.length,
    };
}

export async function apiGetProducts2<T, U extends TableQueries & { filterData?: ProductFilterQueries }>(
    params: U,
) {
    const { pageIndex = 1, pageSize = 50, query: searchQuery, filterData } = params;

    console.log(params);

    let allProducts: Product[] = [];
    const productsRef = collection(db, "products");

    if (searchQuery) {
        const skuQuery = query(productsRef, where("sku", "==", searchQuery.toUpperCase()));
        const skuSnapshot = await getDocs(skuQuery);

        if (!skuSnapshot.empty) {
            allProducts = skuSnapshot.docs.map(doc => Product.fromFirestore(doc.id, doc.data()));
        } else {
            const allSnapshot = await getDocs(productsRef);
            const nameFilteredDocs = allSnapshot.docs.filter(doc =>
                doc.data().name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            allProducts = nameFilteredDocs.map(doc => Product.fromFirestore(doc.id, doc.data()));
        }
    } else if (filterData?.category && filterData.category.length > 0) {
        // Query only products in one of the categories
        const categoryFilteredDocs: Product[] = [];

        for (const cat of filterData.category) {
            const catQuery = query(productsRef, where("category", "==", cat));
            const snapshot = await getDocs(catQuery);
            categoryFilteredDocs.push(
                ...snapshot.docs.map(doc => Product.fromFirestore(doc.id, doc.data()))
            );
        }

        // Remove duplicates by ID
        const seen = new Set();
        allProducts = categoryFilteredDocs.filter(p => {
            if (seen.has(p.sku)) return false;
            seen.add(p.sku);
            return true;
        });
    } else {
        const snapshot = await getDocs(productsRef);
        allProducts = snapshot.docs.map(doc => Product.fromFirestore(doc.id, doc.data()));
    }

    const start = (pageIndex - 1) * pageSize;
    const paginated = allProducts.slice(start, start + pageSize);

    return {
        data: paginated,
        total: allProducts.length,
    };
}


export async function apiUpdateProduct<T, U>(product: Product) {

    const productToUpdate = new Product(product)

    const productRef = doc(db, "products", productToUpdate.sku)

    await setDoc(productRef, productToUpdate.cleanForDatabase(), { merge: true })

    console.log('Product updated:', product.sku)
    return true
}

export async function apiCreateNewProduct<T, U>(product: Product) {
    const productRef = doc(db, "products", product.sku)
    const productSnap = await getDoc(productRef)

    if (productSnap.exists()) {
        console.log('Product already exists:', product.sku)
        return false
    } else {
        await setDoc(productRef, product.cleanForDatabase())
        console.log('Product created:', product.sku)
        return true
    }
}

export async function apiGetWooCommerceOrdersOld<T, U extends TableQueries>(params: U) {
    const queryParams = new URLSearchParams();

    if (params.pageIndex !== undefined) queryParams.append("page", String(params.pageIndex));
    if (params.pageSize !== undefined) queryParams.append("per_page", String(params.pageSize));

    if (params.sort?.key && params.sort?.order) {
        queryParams.append("order", params.sort.order);
    }

    if (params.query?.trim()) {
        queryParams.append("search", params.query);
    }

    const baseUrl = `https://font-station.com/wp-json/wc/v3/orders`;
    const queryString = queryParams.toString();
    const url = `${baseUrl}?${queryString}&consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`;

    console.log("✅ WooCommerce API URL:", url);

    const response = await WordpressApiService.fetchData<T>({
        url,
        method: "get",
    });

    // ✅ Transform WooCommerce Orders to match `Order` type
    const orders = (response.data as any[]).map((order) => ({
        id: order.id.toString(),
        date: new Date(order.date_created).getTime(),
        customer: `${order.billing.first_name} ${order.billing.last_name}`,
        customerFirstName: order.billing.first_name,
        customerLastName: order.billing.last_name,
        customerEmail: order.billing.email,
        status: order.status === "processing" ? 1 : order.status === "completed" ? 0 : 2,
        paymentMethod: order.payment_method_title,
        paymentIdentifier: order.order_key,
        totalAmount: parseFloat(order.total),
        products: order.line_items.map((item: any) => ({
            productName: item.name,
            sku: item.sku || "N/A",
            quantity: item.quantity,
        })),
    }));

    return {
        data: orders,
        headers: response.headers, // ✅ Keep headers for pagination
    };
}


export async function apiGetWooCommerceOrders<T = WooOrder, U extends TableQueries = TableQueries>(params: U) {
    const { pageIndex = 1, pageSize = 50, query: searchQuery, sort } = params;

    const ordersRef = collection(db, "website_orders");

    let baseQuery: any[] = [];

    console.log(params);

    const sortKey = sort?.key ? String(sort.key) : "date";
    const sortDirection = sort?.order === "desc" ? "desc" : "asc";
    baseQuery.push(orderBy(sortKey, sortDirection));

    let finalQuery = query(ordersRef, ...baseQuery);

    if (searchQuery?.trim()) {
        finalQuery = query(ordersRef, where("customerEmail", "==", searchQuery.trim()));
    } else {
        finalQuery = query(ordersRef, ...baseQuery, limit(pageSize * pageIndex));
    }


    const snapshot = await getDocs(finalQuery);

    const docs = snapshot.docs;
    const paginatedDocs = docs.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

    const data = paginatedDocs.map(doc => WooOrder.fromFirestore(doc.data()));

    return {
        data: data as T[],
        total: docs.length,
    };
}

export async function apiGetLicensesSalesOrders<T = WooOrder, U extends TableQueries = TableQueries>(params: U) {
    const { pageIndex = 1, pageSize = 50, query: searchQuery, sort } = params

    console.log("🔍 Fetching license orders with params:", params)

    let allOrders: WooOrder[] = []
    const ordersRef = collection(db, "website_orders")

    console.log("📦 Starting base query with hasLicense == true")
    const baseQuery = query(
        collection(db, "website_orders"),
        where("hasLicense", "==", true),
        orderBy("date", "desc")
    )

    // if (sort?.key) {
    //     const direction = sort.order === "desc" ? "desc" : "asc"
    //     console.log(`🔃 Applying sort by ${sort.key} in ${direction} order`)
    //     baseQuery = query(baseQuery, orderBy(String(sort.key), direction))
    // } else {
    //     console.log("🕒 Applying default sort by date desc")
    //     baseQuery = query(baseQuery, orderBy("date", "desc"))
    // }

    try {
        const snapshot = await getDocs(baseQuery)
        console.log(`📄 Retrieved ${snapshot.size} docs`)
        console.log(`📄 Fetched ${snapshot.size} license orders from Firestore`)

        allOrders = snapshot.docs.map(doc => WooOrder.fromFirestore(doc.data()))

        const start = (pageIndex - 1) * pageSize
        const paginated = allOrders.slice(start, start + pageSize)
        console.log(`📑 Returning page ${pageIndex} with ${paginated.length} orders out of ${allOrders.length}`)
        return {
            data: paginated as T[],
            total: allOrders.length,
        }
    } catch (err) {
        console.error("❌ Firestore query failed:", err)
    }

}


export async function apiDeleteSalesOrders<
    T,
    U extends Record<string, unknown>,
>(data: U) {
    return ApiService.fetchData<T>({
        url: '/sales/orders/delete',
        method: 'delete',
        data,
    })
}

export async function apiGetSalesOrderDetails<
    T,
    U extends Record<string, unknown>,
>(params: U) {
    const response = await WordpressApiService.fetchData<T>({
        url: `orders/${params.id}?consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`,
        method: "get",
    });

    const order = response.data as any; // ✅ Single order object
    console.log("apiGetSalesOrderDetails", order);

    // ✅ Fetch product images for each product
    const productsWithImages = await Promise.all(
        order.line_items.map(async (item: any) => {
            const productResponse = await WordpressApiService.fetchData<any>({
                url: `products/${item.product_id}?consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`,
                method: "get",
            });

            return {
                id: item.id.toString(),
                name: item.name,
                productCode: item.sku || "N/A",
                img: productResponse.data?.images?.[0]?.src || "", // ✅ Get first product image
                price: parseFloat(item.price.toString()),
                quantity: item.quantity,
                total: parseFloat(item.total),
                details: item.meta_data.reduce((acc: Record<string, string[]>, meta: any) => {
                    if (!acc[meta.key]) acc[meta.key] = [];
                    acc[meta.key].push(meta.value);
                    return acc;
                }, {}),
            };
        })
    );

    // ✅ Transform WooCommerce order data into `SalesOrderDetailsResponse`
    const mappedOrder: SalesOrderDetailsResponse = {
        id: order.id.toString(),
        progressStatus: order.status === "processing" ? 1 : 0,
        paymentStatus: order.status === "completed" ? 1 : 0,
        dateTime: new Date(order.date_created).getTime(),
        paymentSummary: {
            subTotal: parseFloat(order.total) - parseFloat(order.total_tax),
            tax: parseFloat(order.total_tax),
            deliveryFees: parseFloat(order.shipping_total),
            total: parseFloat(order.total),
        },
        shipping: {
            deliveryFees: parseFloat(order.shipping_total),
            estimatedMin: 2, // ✅ Placeholder value
            estimatedMax: 5, // ✅ Placeholder value
            shippingLogo: "", // ❌ WooCommerce doesn't provide shipping logos
            shippingVendor:
                order.shipping_lines.length > 0
                    ? order.shipping_lines[0].method_title
                    : "Unknown",
        },
        product: productsWithImages, // ✅ Products now include images
        customer: {
            name: `${order.billing.first_name} ${order.billing.last_name}`,
            email: order.billing.email,
            phone: order.billing.phone || "N/A",
            img: "", // ❌ No profile image from WooCommerce API
            previousOrder: 0, // ✅ Requires another API call to fetch previous orders count
            shippingAddress: {
                line1: order.shipping.address_1,
                line2: order.shipping.address_2 || "",
                line3: `${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}`,
                line4: order.shipping.country,
            },
            billingAddress: {
                line1: order.billing.address_1,
                line2: order.billing.address_2 || "",
                line3: `${order.billing.city}, ${order.billing.state} ${order.billing.postcode}`,
                line4: order.billing.country,
            },
        },
    };

    return {
        data: mappedOrder,
    };
}

export async function apiGetWebsiteSalesDashboardData<T extends DashboardData, U extends DashboardQuery>(params: U) {
    const { startDate, endDate } = params;
    console.log('[🔎] Fetching WooCommerce orders between:', {
        startDate: new Date(startDate * 1000).toISOString(),
        endDate: new Date(endDate * 1000).toISOString(),
    });

    const orderItemsRef = collection(db, 'website_orders');

    const orderItemsQuery = query(
        orderItemsRef,
        where('date', '>=', startDate * 1000),
        where('date', '<=', endDate * 1000),
    );

    console.log('[📤] Running Firestore query...');
    const snapshot = await getDocs(orderItemsQuery);
    console.log(`[📥] Retrieved ${snapshot.size} documents from Firestore.`);

    const orders: WooOrder[] = snapshot.docs.map(doc => doc.data() as WooOrder);
    console.log('[📦] Parsed orders:', orders);

    const grossRevenue = parseFloat(
        orders.reduce((acc, o) => acc + convertToUSD(o.totalAmount || 0, o.currency || 'USD'), 0).toFixed(2)
    );
    console.log('[💰] Gross Revenue:', grossRevenue);

    const netRevenue = parseFloat(
        orders.reduce((acc, o) => {
            const total = convertToUSD(o.totalAmount || 0, o.currency || 'USD');
            const fee = total * 0.029 + 0.3;
            return acc + (total - fee);
        }, 0).toFixed(2)
    );

    console.log('[💸] Net Revenue:', netRevenue);

    const orderCount = orders.length;
    console.log('[📊] Order Count:', orderCount);

    const daysInRange = Math.ceil(((endDate * 1000) - (startDate * 1000)) / (1000 * 60 * 60 * 24));
    const dailyOrderAverage = Math.round(orderCount / daysInRange);
    console.log('[📆] Days in range:', daysInRange, '| Daily Average Orders:', dailyOrderAverage);

    const productSalesMap: Record<string, { name: string; sold: number; revenue: number; img: string }> = {}

    orders.forEach(order => {
        order.products.forEach(p => {
            const key = p.sku || p.productId;
            if (!productSalesMap[key]) {
                productSalesMap[key] = {
                    name: p.productName,
                    sold: 0,
                    revenue: 0,
                    img: '', // Add image later from product data
                };
            }
            productSalesMap[key].sold += p.quantity || 1;
            productSalesMap[key].revenue += convertToUSD((order.totalAmount || 0) / order.products.length, order.currency || 'USD');
        });
    });

    console.log('[📦] Product Sales Map:', productSalesMap);
    const uniqueSkus = Object.keys(productSalesMap);
    const products: Product[] = [];

    const productPromises = uniqueSkus.map(async (sku) => {
        try {
            const productRef = doc(db, "products", sku);
            const snap = await getDoc(productRef);
            if (snap.exists()) {
                const product = Product.fromFirestore(snap.id, snap.data());
                products.push(product);
            }
        } catch (err) {
            console.error('Failed to fetch product for SKU:', sku, err);
        }
    });

    await Promise.all(productPromises);

    uniqueSkus.forEach(sku => {
        const product = products.find(p => p.sku === sku);
        if (product) {
            productSalesMap[sku].img = product.getImageThumbnail() || '';
        }
    });


    const topProductsData = Object.entries(productSalesMap)
        .sort(([, a], [, b]) => b.sold - a.sold)
        .slice(0, 20)
        .map(([id, data]) => ({
            id,
            name: data.name,
            img: data.img,
            sold: data.sold,
        }));

    console.log('[🔥] Top Products Data:', topProductsData);

    const categoryMap: Record<string, number> = {};

    orders.forEach(order => {
        order.products.forEach(p => {
            const product = products.find(prod => prod.sku === p.sku);
            if (product) {
                const category = product.getCategoryName();
                if (!categoryMap[category]) {
                    categoryMap[category] = 0;
                }
                categoryMap[category] += p.quantity || 1;
            }
        });
    });

    const salesByCategoriesData = {
        labels: Object.keys(categoryMap),
        data: Object.values(categoryMap),
    };


    // 🗓️ Group sales by day
    const dailySalesMap: Record<string, { sold: number; revenue: number }> = {}

    orders.forEach(order => {
        const date = new Date(order.date).toISOString().slice(0, 10) // 'YYYY-MM-DD'

        if (!dailySalesMap[date]) {
            dailySalesMap[date] = { sold: 0, revenue: 0 }
        }

        dailySalesMap[date].sold += 1
        dailySalesMap[date].revenue += convertToUSD(order.totalAmount || 0, order.currency || 'USD');
    })

    // 📅 Sort dates
    const sortedDates = Object.keys(dailySalesMap).sort()

    // 📊 Construct salesReportData
    const salesReportData = {
        categories: sortedDates,
        series: [
            {
                name: 'Orders',
                data: sortedDates.map(date => dailySalesMap[date].sold),
            },
            {
                name: 'Revenue ($)',
                data: sortedDates.map(date => parseFloat(dailySalesMap[date].revenue.toFixed(2))),
            },
        ],
    }


    const sortedSales = products.map(p => {
        const salesData = productSalesMap[p.sku] || { sold: 0, revenue: 0 };
        return {
            name: p.getNameWithCategory(),
            sold: salesData.sold,
            revenue: parseFloat(salesData.revenue.toFixed(2)),
        };
    }).sort((a, b) => b.sold - a.sold);

    const productsSoldChartData = {
        categories: sortedSales.map(p => p.name),
        series: [
            {
                name: 'Sold',
                data: sortedSales.map(p => p.sold),
            },
            {
                name: 'Revenues',
                data: sortedSales.map(p => p.revenue),
            },
        ],
    };

    console.log('[📈] Products Sold Chart Data:', productsSoldChartData);

    const data: DashboardData = {
        statisticData: {
            revenue: { value: grossRevenue, growShrink: 0 },
            orders: { value: orderCount, growShrink: 0 },
            dailyOrderAverage: { value: dailyOrderAverage, growShrink: 0 },
        },
        topProductsData,
        salesByCategoriesData,
        productsSoldChartData,
        salesReportData,
    };

    console.log('[✅] Final Dashboard Data:', data);

    return { data } as { data: T };
}

/**
 * Update order status to "completed" in Firestore.
 * @param orderId - The WooCommerce order ID
 */


export const markOrderAsCompleted = async (orderId: string) => {
    try {
        const orderRef = doc(db, "website_orders", orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            // If the order doesn't exist, create it first
            await setDoc(orderRef, { licenseDelivered: true });
        } else {
            // Otherwise, update the existing order
            await updateDoc(orderRef, { licenseDelivered: true });
        }

        console.log(`✅ Order ${orderId} marked as completed.`);
        return true;
    } catch (error) {
        console.error(`❌ Error updating order ${orderId}:`, error);
        return false;
    }
};

