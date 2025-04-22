import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
    apiGetProducts,
    apiDeleteSalesProducts,
    apiGetProductsThatNeedReview,
    apiGetRandomProducts
} from '@/services/SalesService'
import type { TableQueries } from '@/@types/common'
import { Product } from '@/@types/product'

type Products = Product[]

export type GetSalesProductsResponse = {
    data: Products
    total: number
}

export type ProductFilterQueries = {
    name: string
    category: string[]
    status: string
    productStatus: number
}

export type SalesProductListState = {
    loading: boolean
    deleteConfirmation: boolean
    selectedProduct: string
    tableData: TableQueries
    filterData: ProductFilterQueries
    productList: Product[]
}

type GetProductsRequest = TableQueries & { filterData?: ProductFilterQueries }

export const SLICE_NAME = 'reviewsProductList'

export const getRandomProducts = createAsyncThunk(
    SLICE_NAME + '/getRandomProducts',
    async (params: { category: string, limit: number }, { rejectWithValue }) => {
        try {
            const response = await apiGetRandomProducts(params)
            return response.data
        } catch (error) {
            console.error("❌ Error fetching random products:", error)
            return rejectWithValue("Failed to fetch random products")
        }
    }
)

export const getProducts = createAsyncThunk(
    SLICE_NAME + '/getProducts',
    async (data: GetProductsRequest, { rejectWithValue }) => {
        try {
            const response = await apiGetProductsThatNeedReview<GetSalesProductsResponse, GetProductsRequest>(data);
            return response;
        } catch (error) {
            console.error("❌ Error fetching products:", error);
            return rejectWithValue("Failed to fetch products");
        }
    }
);

export const deleteProduct = async (data: { id: string | string[] }) => {
    const response = await apiDeleteSalesProducts<
        boolean,
        { id: string | string[] }
    >(data)
    return response.data
}

export const initialTableData: TableQueries = {
    total: 0,
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: {
        order: 'asc',
        key: 'sku',
    },
}

const initialState: SalesProductListState = {
    loading: false,
    deleteConfirmation: false,
    selectedProduct: "",
    productList: [],
    tableData: initialTableData,
    filterData: {
        name: "",
        category: [],
        status: "",
        productStatus: 1,
    },
}

const productListSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
        updateProductList: (state, action) => {
            state.productList = action.payload
        },
        setTableData: (state, action) => {
            state.tableData = action.payload
        },
        setFilterData: (state, action) => {
            state.filterData = action.payload
        },
        toggleDeleteConfirmation: (state, action) => {
            state.deleteConfirmation = action.payload
        },
        setSelectedProduct: (state, action) => {
            state.selectedProduct = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getProducts.pending, (state) => {
                state.loading = true;
            })
            .addCase(getProducts.fulfilled, (state, action) => {
                state.loading = false;
                if (Array.isArray(action.payload.data)) {
                    state.productList = action.payload.data; // ✅ Ensure it's an array before assigning
                } else {
                    console.error("❌ Unexpected response structure:", action.payload);
                    state.productList = []; // ✅ Fallback to empty array if data is not valid
                }
                state.tableData.total = action.payload.total; // ✅ Store total count for pagination
            })
            .addCase(getProducts.rejected, (state, action) => {
                state.loading = false;
                console.error("❌ Fetch products failed:", action.payload);
            });
    },
})

export const {
    updateProductList,
    setTableData,
    setFilterData,
    toggleDeleteConfirmation,
    setSelectedProduct,
} = productListSlice.actions

export default productListSlice.reducer
