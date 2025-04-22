import { TableQueries } from '@/@types/common'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
//import { CustomerStatistics } from './dsdsdsstatisticsSlice'
import { apiGetCrmCustomers, apiGetCrmCustomersStatistic } from '@/services/CrmService'

export const SLICE_NAME = 'customers'
// ✅ Define Customer Type
export interface Customer {
    id: number
    first_name: string
    last_name: string
    email: string
    avatar_url: string
    status: number
}

type Statistic = {
    value: number
    growShrink: number
}

type CustomerStatistic = {
    totalCustomers: Statistic
    activeCustomers: Statistic
    newCustomers: Statistic
}

type CustomerStatisticItem = {
    slug: string;
    name: string;
    total: number;
};

type CustomerStatisticResponse = {
    data: CustomerStatisticItem[];
};

export type Filter = {
    status: string
}

type GetCrmCustomersResponse = {
    data: Customer[]
    total: number
}

type GetCrmCustomersStatisticResponse = {
    data: CustomerStatisticItem[];
};

export type CustomersState = {
    loading: boolean
    statisticLoading: boolean
    customerList: Customer[]
    statisticData: Partial<CustomerStatistic>
    tableData: TableQueries
    filterData: Filter
    drawerOpen: boolean
    selectedCustomer: Partial<Customer>
}

export const initialTableData: TableQueries = {
    total: 0,
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: {
        order: '',
        key: '',
    },
}

export const initialFilterData = {
    status: '',
}

// WooCommerce API URL
export const API_CUSTOMERS_URL = `${import.meta.env.VITE_WOOCOMMERCE_CUSTOMER_URL}?consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`
const API_CUSTOMER_STATISTICS_URL = `${import.meta.env.VITE_WOOCOMMERCE_CUSTOMER_STATISTICS_URL}?consumer_key=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`;

// Fetch Customers from WooCommerce
export const getCustomers2 = createAsyncThunk(
    'customers/data/getCustomers',
    async (params: TableQueries & { filterData?: Filter }) => {
        const url = new URL(API_CUSTOMERS_URL);

        // ✅ Add pagination and sorting queries
        /*if (params.page) url.searchParams.append('page', params.page.toString());
        if (params.perPage) url.searchParams.append('per_page', params.perPage.toString());
        if (params.sortBy) url.searchParams.append('orderby', params.sortBy);
        if (params.sortOrder) url.searchParams.append('order', params.sortOrder);

        // ✅ Add filters
        if (params.filterData?.status) url.searchParams.append('status', params.filterData.status);
        if (params.filterData?.search) url.searchParams.append('search', params.filterData.search);
*/
        const response = await fetch(url.toString());
        const data: Customer[] = await response.json();

        // ✅ Assign status to each customer
        return data.map(customer => ({
            ...customer,
            status: customer.id === 0 ? 'guest' : 'registered',
        }));
    }
);

export const getCustomers = createAsyncThunk(
    'customers/data/getCustomers',
    async (data: TableQueries & { filterData?: Filter }, { rejectWithValue }) => {
        try {
            const response = await apiGetCrmCustomers<GetCrmCustomersResponse, TableQueries>(data);

            // ✅ Extract total customers from response headers
            const totalCustomers = Number(response.headers?.['x-wp-total'] || 0);
            console.log("getCustomers", response.data)
            return {
                data: response.data, // ✅ Correctly return customers data
                total: totalCustomers, // ✅ Assign correct total count
            };
        } catch (error) {
            console.error("❌ Error fetching customers:", error);
            return rejectWithValue("Failed to fetch customers");
        }
    }
);



export const getCustomerStatistic = createAsyncThunk(
    'customers/data/getCustomerStatistic',
    async () => {
        const response =
            await apiGetCrmCustomersStatistic<GetCrmCustomersStatisticResponse>()

        if (!response || !Array.isArray(response.data)) {
            throw new Error("Failed to fetch customer statistics or data is not an array");
        }

        // ✅ Convert API array response to correct Redux state format
        const statisticsMap = response.data.reduce((acc, item) => {
            if (item.slug === "paying") {
                acc.totalCustomers = { value: item.total };
            }
            if (item.slug === "non_paying") {
                acc.activeCustomers = { value: item.total };
            }
            // Add additional conditions if needed for `newCustomers` or other fields
            return acc;
        }, {
            totalCustomers: { value: 0 }, // Default values
            activeCustomers: { value: 0 },
            newCustomers: { value: 0 } // Default for new customers
        });

        console.log('Mapped Data:', statisticsMap);
        return statisticsMap; // ✅ Return correctly formatted data
    },
)


/*export const getCustomerStatistic2 = createAsyncThunk(
    'statistics/fetchStatistics',
    async (): Promise<CustomerStatistic> => {
        const response = await fetch(API_CUSTOMER_STATISTICS_URL);
        if (!response.ok) {
            throw new Error("Failed to fetch customer statistics");
        }
        const data = await response.json();

        // Sum total customers from all categories
        const totalCustomers = data.reduce((sum: number, customerType: { total: string }) => sum + parseInt(customerType.total, 10), 0);

        return { total: totalCustomers };
    }
);*/


const initialState: CustomersState = {
    loading: false,
    statisticLoading: false,
    customerList: [],
    statisticData: {},
    tableData: initialTableData,
    filterData: initialFilterData,
    drawerOpen: false,
    selectedCustomer: {},
}
// Redux Slice
const customersSlice = createSlice({
    name: 'customers',
    initialState,
    reducers: {
        setTableData: (state, action) => {
            state.tableData = action.payload
        },
        setCustomerList: (state, action) => {
            state.customerList = action.payload
        },
        setFilterData: (state, action) => {
            state.filterData = action.payload
        },
        setSelectedCustomer: (state, action) => {
            state.selectedCustomer = action.payload
        },
        setDrawerOpen: (state) => {
            state.drawerOpen = true
        },
        setDrawerClose: (state) => {
            state.drawerOpen = false
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getCustomers.fulfilled, (state, action) => {
                console.log("Action Payload:", action);
                state.customerList = action.payload.data
                state.tableData.total = action.payload.total
                state.loading = false
            })
            .addCase(getCustomers.pending, (state) => {
                state.loading = true
            })
            .addCase(getCustomerStatistic.fulfilled, (state, action) => {
                state.statisticData = action.payload
                state.statisticLoading = false
            })
            .addCase(getCustomerStatistic.pending, (state) => {
                state.statisticLoading = true
            })
            .addCase(getCustomerStatistic.rejected, (state) => {
                state.statisticData = initialState.statisticData; // ✅ Reset to prevent errors
                state.statisticLoading = false;
            });
    },
})

export const {
    setTableData,
    setCustomerList,
    setFilterData,
    setSelectedCustomer,
    setDrawerOpen,
    setDrawerClose,
} = customersSlice.actions

export default customersSlice.reducer
