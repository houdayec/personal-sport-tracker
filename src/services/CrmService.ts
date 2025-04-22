import { TableQueries } from '@/@types/common';
import ApiService from './ApiService'
import WordpressApiService from './WordpressService'
import { Customer, Filter } from '@/views/website/Customers/store';

export async function apiGetCrmDashboardData<T>() {
    return ApiService.fetchData<T>({
        url: '/crm/dashboard',
        method: 'get',
    })
}

export async function apiGetCrmCalendar<T>() {
    return ApiService.fetchData<T>({
        url: '/crm/calendar',
        method: 'get',
    })
}

export async function apiGetCrmCustomers<T, U extends TableQueries & { filterData?: Filter }>(
    params: U,
) {
    const queryParams = new URLSearchParams();

    if (params.pageIndex !== undefined) queryParams.append('page', String(params.pageIndex));
    if (params.pageSize !== undefined) queryParams.append('per_page', String(params.pageSize));

    if (params.sort?.key && params.sort?.order) {
        queryParams.append('order', params.sort.order);
    }

    if (params.query?.trim()) {
        queryParams.append('search', params.query);
    }

    if (params.filterData?.status?.trim()) {
        queryParams.append('status', params.filterData.status);
    }

    const baseUrl = `https://font-station.com/wp-json/wc/v3/customers`;
    const queryString = queryParams.toString();
    const url = `${baseUrl}?${queryString}&consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`;

    console.log('✅ WooCommerce API URL:', url);

    const response = await WordpressApiService.fetchData<T>({
        url,
        method: 'get',
    });

    // ✅ Transform customers to include `status`
    const modifiedCustomers = (response.data as Customer[]).map(customer => ({
        ...customer,
        status: customer.id === 0 ? 0 : 1, // ✅ Assign status
    }));

    // ✅ Return modified data with headers
    return {
        data: modifiedCustomers, // ✅ Modified customers
        headers: response.headers, // ✅ Keep headers for total count extraction
    };
}

export async function apiGetCrmCustomersStatistic<T>() {
    return WordpressApiService.fetchData<T>({
        url: `reports/customers/totals?consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`,
        method: 'get',
    })
}

export async function apPutCrmCustomer<T, U extends Record<string, unknown>>(
    data: U,
) {
    return ApiService.fetchData<T>({
        url: '/crm/customers',
        method: 'put',
        data,
    })
}

export async function apiGetCrmCustomerDetails<
    T,
    U extends Record<string, unknown>,
>(params: U) {
    return ApiService.fetchData<T>({
        url: '/crm/customer-details',
        method: 'get',
        params,
    })
}

export async function apiDeleteCrmCustomer<
    T,
    U extends Record<string, unknown>,
>(data: U) {
    return ApiService.fetchData<T>({
        url: '/crm/customer/delete',
        method: 'delete',
        data,
    })
}

export async function apiGetCrmMails<T, U extends Record<string, unknown>>(
    params: U,
) {
    return ApiService.fetchData<T>({
        url: '/crm/mails',
        method: 'get',
        params,
    })
}

export async function apiGetCrmMail<T, U extends Record<string, unknown>>(
    params: U,
) {
    return ApiService.fetchData<T>({
        url: '/crm/mail',
        method: 'get',
        params,
    })
}

// featured0425 : 1003

const EXCLUDED_SKUS = new Set([
    'FT191', 'FT161', 'FT003', 'FT004', 'FT088', 'FT155', 'FT156', 'FT157', 'FT158', 'FT159',
    'FT160', 'FT162', 'FT163', 'FT164', 'FT165', 'FT166', 'FT167', 'FTS001', 'FTS002', 'FTS003',
    'FTS004', 'FTS005', 'FTS006', 'FTS007', 'FTS008', 'FTS009', 'FTS010', 'FTS011', 'FTS012',
    'FT010', 'FT011', 'FT013', 'FT041', 'FT001', 'FT021', 'FT022', 'FT017', 'FT055', 'FT025',
    'FT049', 'FT002', 'FT057', 'FT058', 'FT059', 'FT028', 'FT008', 'FT030', 'FT007', 'FT074',
    'FT065', 'FT035', 'FT019', 'FT020', 'FT170', 'FT190', 'FT038', 'FT085', 'FT043', 'FT047',
    'FT009', 'FT187', 'FT077', 'FT032', 'FT036', 'FT096', 'FT015', 'FT033', 'FT044', 'FT052',
    'FT051', 'FT066', 'FT056', 'FT054'
]);

export async function bulkTagProducts(tagId: number) {
    const allProducts: { id: number; sku: string; tags: any[] }[] = [];
    let page = 1;
    let fetched;

    // 🔄 Loop through all pages (max 100 products per request)
    do {
        const url = `https://font-station.com/wp-json/wc/v3/products?per_page=100&page=${page}&consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`;
        console.log(`📦 Fetching page ${page}`);

        const response = await WordpressApiService.fetchData<typeof allProducts>({
            url,
            method: 'get',
        });

        fetched = response.data;
        allProducts.push(...fetched);
        page++;
    } while (fetched.length === 100);

    console.log(`✅ Total products fetched: ${allProducts.length}`);

    const productsToUpdate = allProducts.filter(p => !EXCLUDED_SKUS.has(p.sku));

    for (const product of productsToUpdate) {
        const currentTagIds = product.tags.map(tag => tag.id);
        if (currentTagIds.includes(tagId)) {
            console.log(`⏭️ Skipping product ID ${product.id} (already tagged)`);
            continue;
        }

        const updatedTags = [...currentTagIds, tagId];
        const updateUrl = `https://font-station.com/wp-json/wc/v3/products/${product.id}?consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`;

        console.log(`✏️ Updating product ID ${product.id}`);
        const auth = {
            username: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
            password: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
        }
        await WordpressApiService.fetchData({
            url: updateUrl,
            method: 'put',
            data: {
                tags: updatedTags.map(id => ({ id })),
            },
            auth
        });
    }

    console.log(`🎉 Finished updating ${productsToUpdate.length} products.`);
}
