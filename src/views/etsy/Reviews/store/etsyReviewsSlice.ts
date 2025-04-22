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
import { EtsyReview } from '@/@types/etsy_review'
import { apiGetEtsyReviews } from '@/services/EtsyReviewService'

type EtsyReviews = EtsyReview[]

type GetEtsyReviewsResponse = {
    data: EtsyReviews
    total: number
}

export type EtsyOrderListState = {
    loading: boolean
    reviewList: EtsyReviews
    tableData: TableQueries
    deleteMode: 'single' | 'batch' | ''
    selectedRows: string[]
    selectedRow: string,
    filterData: EtsyReviewFilterQueries
}

export const SLICE_NAME = 'etsyReviewsSlice'

type GetReviewsRequest = TableQueries & { filterData?: EtsyReviewFilterQueries }

export const getEtsyReviews = createAsyncThunk(
    SLICE_NAME + '/getEtsyReviews',
    async (data: GetReviewsRequest) => {
        const response = await apiGetEtsyReviews<
            GetEtsyReviewsResponse,
            GetReviewsRequest
        >(data)
        return response
    },
)

export type EtsyReviewFilterQueries = {
    starRating?: number            // Filter by star rating (e.g., [1,2])
    treated?: boolean | null     // Show only treated (true), untreated (false), or all (null)
    syncWithWordPress?: boolean | null // Sync status
    onlyBadReviews?: boolean
}

export const initialFilterData: EtsyReviewFilterQueries = {
    starRating: 5,                  // No filter by default (show all ratings)
    treated: null,               // No filter by default
    syncWithWordPress: null,    // No filter by default
    onlyBadReviews: false
}

export const initialTableData: TableQueries = {
    total: 0,
    pageIndex: 1,
    pageSize: 50,
    query: '',
    sort: {
        order: '',
        key: '',
    },
}

const initialState: EtsyOrderListState = {
    loading: false,
    reviewList: [],
    tableData: initialTableData,
    selectedRows: [],
    selectedRow: '',
    deleteMode: '',
    filterData: initialFilterData,
}

const orderListSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
        setReviewList: (state, action) => {
            state.reviewList = action.payload
        },
        setTableData: (state, action) => {
            state.tableData = action.payload;
        },
        setSelectedRows: (state, action) => {
            state.selectedRows = action.payload
        },
        setSelectedRow: (state, action) => {
            state.selectedRow = action.payload
        },
        setFilterData: (state, action) => {
            state.filterData = action.payload
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
        updateReviewTreatedStatus: (state, action) => {
            const { orderId, isTreated } = action.payload;
            const order = state.reviewList.find(order => order.orderId === orderId);
            if (order) {
                order.treated = isTreated;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getEtsyReviews.fulfilled, (state, action) => {
                console.log('getFollowupOrders.fulfilled', action)
                state.reviewList = action.payload.data
                state.tableData.total = action.payload.total
                state.loading = false
            })
            .addCase(getEtsyReviews.pending, (state) => {
                state.loading = true
            })
    },
})

export const {
    setReviewList,
    setTableData,
    setSelectedRows,
    setSelectedRow,
    addRowItem,
    removeRowItem,
    setDeleteMode,
    updateReviewTreatedStatus,
    setFilterData,
} = orderListSlice.actions

export default orderListSlice.reducer
