import {
    createSlice,
    createAsyncThunk,
    current,
    PayloadAction,
} from '@reduxjs/toolkit'
import {
    apiGetWooCommerceOrders,
    apiDeleteSalesOrders,
} from '@/services/SalesService'
import type { TableQueries } from '@/@types/common'
import { EtsyOrder } from '@/@types/etsy_order'
import { apiGetCustomerRelatedEtsyOrders, apiGetFollowupEtsyOrders } from '@/services/EtsyOrderService'

type EtsyOrders = EtsyOrder[]

type GetEtsyOrdersResponse = {
    data: EtsyOrders
    total: number
}

export type EtsyOrderListState = {
    loading: boolean
    orderList: EtsyOrders
    tableData: TableQueries
    deleteMode: 'single' | 'batch' | ''
    selectedRows: string[]
    selectedRow: string
}

export const SLICE_NAME = 'etsyOrderList'

export const getOrders = createAsyncThunk(
    SLICE_NAME + '/getOrders',
    async (data: TableQueries) => {
        const response = await apiGetWooCommerceOrders<
            GetEtsyOrdersResponse,
            TableQueries
        >(data)
        return response.data
    },
)

export const getFollowupOrders = createAsyncThunk(
    SLICE_NAME + '/getFollowupOrders',
    async (data: TableQueries) => {
        const response = await apiGetFollowupEtsyOrders<
            GetEtsyOrdersResponse,
            TableQueries
        >(data)
        return response
    },
)

export const getCustomerOrderHistory = createAsyncThunk(
    'etsy/getCustomerOrderHistory',
    async (orderId: string): Promise<EtsyOrder[]> => {
        const results = await apiGetCustomerRelatedEtsyOrders(orderId)
        return results
    }
)

export const deleteOrders = async (data: { id: string | string[] }) => {
    const response = await apiDeleteSalesOrders<
        boolean,
        { id: string | string[] }
    >(data)
    return response.data
}

const initialState: EtsyOrderListState = {
    loading: false,
    orderList: [],
    tableData: {
        total: 0,
        pageIndex: 1,
        pageSize: 50,
        query: '',
        sort: {
            order: '',
            key: '',
        },
    },
    selectedRows: [],
    selectedRow: '',
    deleteMode: '',
}

const orderListSlice = createSlice({
    name: `${SLICE_NAME}/state`,
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
        updateOrderFollowupStatus: (state, action) => {
            const { orderId, isFollowupDone } = action.payload;
            const order = state.orderList.find(order => order.orderId === orderId);
            if (order) {
                order.isFollowupDone = isFollowupDone;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getFollowupOrders.fulfilled, (state, action) => {
                console.log('getFollowupOrders.fulfilled', action)
                state.orderList = action.payload.data
                state.tableData.total = action.payload.total
                state.loading = false
            })
            .addCase(getFollowupOrders.pending, (state) => {
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
    updateOrderFollowupStatus,
} = orderListSlice.actions

export default orderListSlice.reducer
