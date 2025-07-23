import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
    apiGetProduct,
    apiUpdateProduct as apiUpdateProduct,
    apiDeleteSalesProducts,
} from '@/services/SalesService'
import { Product } from '@/@types/product'
import { deleteFromFirebaseDB, deleteFromFirebaseStorage } from '@/services/StorageService'
import { deleteWooProductBySku } from '@/services/WooService'

export type SalesProductEditState = {
    loading: boolean
    product: Product
}

export const SLICE_NAME = 'salesProductEdit'

export const getProduct = createAsyncThunk(
    SLICE_NAME + '/getProducts',
    async (data: { id: string }) => {
        const response = await apiGetProduct<
            Product,
            { id: string }
        >(data)
        return response.data
    },
)

export const updateProduct = async (data: Product) => {
    const response = await apiUpdateProduct<boolean, Product>(data)
    return response
}

export const deleteProduct = async ({ id }: { id: string }) => {
    try {
        await Promise.all([
            deleteFromFirebaseDB(id),
            deleteFromFirebaseStorage(id),
            deleteWooProductBySku(id),
        ])
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error }
    }
}

const initialState: SalesProductEditState = {
    loading: true,
    product: {},
}

const productEditSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getProduct.fulfilled, (state, action) => {
                state.product = action.payload
                state.loading = false
            })
            .addCase(getProduct.pending, (state) => {
                state.loading = true
            })
    },
})

export default productEditSlice.reducer
