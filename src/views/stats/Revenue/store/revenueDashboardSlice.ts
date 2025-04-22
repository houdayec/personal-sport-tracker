import { apiGetRevenueDashboardData } from '@/services/RevenueService'
import { DashboardData } from '@/views/etsy/EtsyStats/store'
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'

export type RevenueDashboardData = {
    etsyStatisticData?: {
        totalRevenue: number
        averageDailyRevenue: number
        averageWeeklyRevenue: number
    }
    etsyRevenueData?: {
        series: {
            name: string
            data: number[]
        }[]
        categories: string[]
        colors: string[]
    }
    stripeStatisticData?: {
        totalRevenue: number
        averageDailyRevenue: number
        averageWeeklyRevenue: number
    }
    stripeRevenueData?: {
        series: {
            name: string
            data: number[]
        }[]
        categories: string[]
        colors: string[]
    }
}

export type RevenueDashboardDataResponse = RevenueDashboardData

export type DashboardQuery = {
    startDate: number
    endDate: number
}

export type RevenueDashboardState = {
    startDate: number
    endDate: number
    loading: boolean
    dashboardData: RevenueDashboardData
}

export const SLICE_NAME = 'revenueDashboard'

export const getRevenueDashboardData = createAsyncThunk(
    SLICE_NAME + '/getEtsySalesDashboardData',
    async (params: DashboardQuery) => {
        const response = await apiGetRevenueDashboardData<RevenueDashboardDataResponse, DashboardQuery>(params)
        return response.data
    },
)

const now = dayjs()
const startOfMonth = now.startOf('month').unix()
const endOfMonth = now.unix()

export const initialState: RevenueDashboardState = {
    startDate: startOfMonth,
    endDate: endOfMonth,
    loading: true,
    dashboardData: {},
}

const websiteSalesDashboardSlice = createSlice({
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
            .addCase(getRevenueDashboardData.fulfilled, (state, action) => {
                state.dashboardData = action.payload
                state.loading = false
            })
            .addCase(getRevenueDashboardData.pending, (state) => {
                state.loading = true
            })
    },
})

export const { setStartDate, setEndDate } = websiteSalesDashboardSlice.actions

export default websiteSalesDashboardSlice.reducer
