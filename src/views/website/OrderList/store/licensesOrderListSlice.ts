import {
    createSlice,
    createAsyncThunk,
    current,
    PayloadAction,
} from '@reduxjs/toolkit'

import type { TableQueries } from '@/@types/common'
import { apiDeleteSalesOrders, apiGetLicensesSalesOrders, apiGetWooCommerceOrders } from '@/services/SalesService'
import { WooOrder } from '@/@types/woo_order'

type LicensesOrders = WooOrder[]

type GetSalesOrdersResponse = {
    data: LicensesOrders
    total: number
}

export type LicensesOrderListState = {
    loading: boolean
    orderList: LicensesOrders
    tableData: TableQueries
    deleteMode: 'single' | 'batch' | ''
    selectedRows: string[]
    selectedRow: string
}

export const LICENSES_ORDERS_SLICE_NAME = 'licensesOrderList'

export const getLicensesOrders = createAsyncThunk(
    LICENSES_ORDERS_SLICE_NAME + '/getLicensesOrders',
    async (data: TableQueries) => {
        const response = await apiGetLicensesSalesOrders<GetSalesOrdersResponse, TableQueries>(data);
        console.log("getLicensesOrders", response.data)

        //const totalOrders = Number(response.headers?.['x-wp-total'] || 0);
        return {
            data: response.data, // ✅ Correctly return customers data
            total: response.total, // ✅ Assign correct total count
        };
    },
)

export const deleteLicensesOrders = async (data: { id: string | string[] }) => {
    const response = await apiDeleteSalesOrders<
        boolean,
        { id: string | string[] }
    >(data)
    return response.data
}

const initialState: LicensesOrderListState = {
    loading: false,
    orderList: [],
    tableData: {
        total: 0,
        pageIndex: 1,
        pageSize: 25,
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

const licensesOrderListSlice = createSlice({
    name: `${LICENSES_ORDERS_SLICE_NAME}/state`,
    initialState,
    reducers: {
        updateLicenseOrderStatus: (state, action: PayloadAction<{ orderId: string; licenseDelivered: boolean }>) => {
            const { orderId, licenseDelivered } = action.payload;
            const order = state.orderList.find(order => order.id === orderId);
            if (order) {
                order.licenseDelivered = licenseDelivered;
            }
        },
        setLicensesOrderList: (state, action) => {
            state.orderList = action.payload
        },
        setLicensesTableData: (state, action) => {
            state.tableData = action.payload
        },
        setLicensesSelectedRows: (state, action) => {
            state.selectedRows = action.payload
        },
        setLicensesSelectedRow: (state, action) => {
            state.selectedRow = action.payload
        },
        addLicensesRowItem: (state, { payload }) => {
            const currentState = current(state)
            if (!currentState.selectedRows.includes(payload)) {
                state.selectedRows = [...currentState.selectedRows, ...payload]
            }
        },
        removeLicensesRowItem: (state, { payload }: PayloadAction<string>) => {
            const currentState = current(state)
            if (currentState.selectedRows.includes(payload)) {
                state.selectedRows = currentState.selectedRows.filter(
                    (id) => id !== payload,
                )
            }
        },
        setLicensesDeleteMode: (state, action) => {
            state.deleteMode = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getLicensesOrders.fulfilled, (state, action) => {
                console.log('fullfilled')
                state.orderList = action.payload.data
                state.tableData.total = action.payload.total
                state.loading = false
            })
            .addCase(getLicensesOrders.pending, (state) => {
                state.loading = true
            })
    },
})


export const {
    updateLicenseOrderStatus,
    setLicensesOrderList,
    setLicensesTableData,
    setLicensesSelectedRows,
    setLicensesSelectedRow,
    addLicensesRowItem,
    removeLicensesRowItem,
    setLicensesDeleteMode,
} = licensesOrderListSlice.actions

export default licensesOrderListSlice.reducer
