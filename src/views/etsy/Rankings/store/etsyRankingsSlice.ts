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
import { apiGetSearchQueries } from '@/services/EtsyRankingService'
import { SearchQuery } from '@/shared/search_query'

type SearchQueries = SearchQuery[]

type getEtsyRankingsResponse = {
    data: SearchQueries
    total: number
}

export type SearchQueryListState = {
    loading: boolean
    rankingsList: SearchQueries
    tableData: TableQueries
    deleteMode: 'single' | 'batch' | ''
    selectedRows: string[]
    selectedRow: string,
    filterData: SearchQueryFilterQueries
}

export const SLICE_NAME = 'etsyRankingsSlice'

type GetReviewsRequest = TableQueries & { filterData?: SearchQueryFilterQueries }

export const getEtsyRankings = createAsyncThunk(
    SLICE_NAME + '/getEtsyRankings',
    async (data: GetReviewsRequest) => {
        const response = await apiGetSearchQueries<
            getEtsyRankingsResponse,
            GetReviewsRequest
        >(data)
        return response
    },
)

export type SearchQueryFilterQueries = {
    currentRank?: number | 5 // Current rank filter (1, 2, 3, 4 or Not Ranked > 4)
    historyRank?: number | 5 // History rank filter (1, 2, 3, 4 or Not Ranked > 4)
}

export const initialFilterData: SearchQueryFilterQueries = {
    currentRank: undefined,            // No filter by default (show all ranks)
    historyRank: undefined,            // No filter by default (show all history ranks)
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

const initialState: SearchQueryListState = {
    loading: false,
    rankingsList: [],
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
            state.rankingsList = action.payload
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

        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getEtsyRankings.fulfilled, (state, action) => {
                state.rankingsList = action.payload.data
                state.tableData.total = action.payload.total
                state.loading = false
            })
            .addCase(getEtsyRankings.pending, (state) => {
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
