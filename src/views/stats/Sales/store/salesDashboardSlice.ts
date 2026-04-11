import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import { apiGetWebsiteSalesDashboardData } from '@/services/SalesService'

type Statistic = {
    value: number
    growShrink: number
}

export type DashboardData = {
    statisticData?: {
        revenue: Statistic
        orders: Statistic
        dailyOrderAverage: Statistic
    }
    salesReportData?: {
        series: {
            name: string
            data: number[]
        }[]
        categories: string[]
    }
}

type DashboardDataResponse = DashboardData

export type DashboardQuery = {
    startDate: number
    endDate: number
}

export type SalesDashboardState = {
    startDate: number
    endDate: number
    loading: boolean
    dashboardData: DashboardData
}

export const SLICE_NAME = 'salesDashboard'

export const getSalesDashboardData = createAsyncThunk(
    `${SLICE_NAME}/getSalesDashboardData`,
    async (params: DashboardQuery) => {
        const response = await apiGetWebsiteSalesDashboardData<
            DashboardDataResponse,
            DashboardQuery
        >(params)
        return response.data
    },
)

const now = dayjs()

const initialState: SalesDashboardState = {
    startDate: now.startOf('month').unix(),
    endDate: now.unix(),
    loading: true,
    dashboardData: {},
}

const salesDashboardSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
        setStartDate: (state, action: PayloadAction<number>) => {
            state.startDate = action.payload
        },
        setEndDate: (state, action: PayloadAction<number>) => {
            state.endDate = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSalesDashboardData.fulfilled, (state, action) => {
                state.dashboardData = action.payload
                state.loading = false
            })
            .addCase(getSalesDashboardData.pending, (state) => {
                state.loading = true
            })
    },
})

export const { setStartDate, setEndDate } = salesDashboardSlice.actions

export default salesDashboardSlice.reducer
