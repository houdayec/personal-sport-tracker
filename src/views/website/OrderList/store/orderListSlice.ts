import {
    createSlice,
    createAsyncThunk,
    current,
    PayloadAction,
} from '@reduxjs/toolkit'

import type { TableQueries } from '@/@types/common'
import { apiDeleteSalesOrders, apiGetLicensesSalesOrders, apiGetWooCommerceOrders } from '@/services/SalesService'
import { WooOrder } from '@/@types/woo_order'

type WooOrders = WooOrder[]

type GetSalesOrdersResponse = {
    data: WooOrders
    total: number
}

export type SalesOrderListState = {
    loading: boolean
    orderList: WooOrders
    tableData: TableQueries
    deleteMode: 'single' | 'batch' | ''
    selectedRows: string[]
    selectedRow: string
}

export const ORDERS_SLICE_NAME = 'salesOrderList'

export const getOrders = createAsyncThunk(
    ORDERS_SLICE_NAME + '/getOrders',
    async (data: TableQueries) => {
        const response = await apiGetWooCommerceOrders<GetSalesOrdersResponse, TableQueries>(data);

        //const totalOrders = Number(response.headers?.['x-wp-total'] || 0);
        return {
            data: response.data, // ✅ Correctly return customers data
            //total: response.total, // ✅ Assign correct total count
            total: 10000, // ✅ Assign correct total count
        };
    },
)

export const deleteOrders = async (data: { id: string | string[] }) => {
    const response = await apiDeleteSalesOrders<
        boolean,
        { id: string | string[] }
    >(data)
    return response.data
}

const initialState: SalesOrderListState = {
    loading: false,
    orderList: [],
    tableData: {
        total: 0,
        pageIndex: 1,
        pageSize: 10,
        query: '',
        sort: {
            order: 'desc',
            key: 'date',
        },
    },
    selectedRows: [],
    selectedRow: '',
    deleteMode: '',
}

const orderListSlice = createSlice({
    name: `${ORDERS_SLICE_NAME}/state`,
    initialState,
    reducers: {
        setOrderList: (state, action) => {
            state.orderList = action.payload
        },
        setTableData: (state, action) => {
            state.tableData = action.payload
        },
        setSelectedRows: (state, action) => {
            state.selectedRows = action.payload
        },
        setSelectedRow: (state, action) => {
            state.selectedRow = action.payload
        },
        addRowItem: (state, { payload }) => {
            const currentState = current(state)
            if (!currentState.selectedRows.includes(payload)) {
                state.selectedRows = [...currentState.selectedRows, ...payload]
            }
        },
        removeRowItem: (state, { payload }: PayloadAction<string>) => {
            const currentState = current(state)
            if (currentState.selectedRows.includes(payload)) {
                state.selectedRows = currentState.selectedRows.filter(
                    (id) => id !== payload,
                )
            }
        },
        setDeleteMode: (state, action) => {
            state.deleteMode = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getOrders.fulfilled, (state, action) => {
                state.orderList = action.payload.data
                state.tableData.total = action.payload.total
                state.loading = false
            })
            .addCase(getOrders.pending, (state) => {
                state.loading = true
            })
    },
})


export const {
    setOrderList,
    setTableData,
    setSelectedRows,
    setSelectedRow,
    addRowItem,
    removeRowItem,
    setDeleteMode,
} = orderListSlice.actions

export default orderListSlice.reducer
