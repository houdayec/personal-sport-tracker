import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import { apigetEtsySalesDashboardData, apiGetWebsiteSalesDashboardData } from '@/services/SalesService'

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
    topProductsData?: {
        id: string
        name: string
        img: string
        sold: number
    }[]
    salesByCategoriesData?: {
        labels: string[]
        data: number[]
    }
    productsSoldChartData?: {
        categories: string[]
        series: {
            name: string
            data: number[]
        }[]
    }
}

type DashboardDataResponse = DashboardData

export type DashboardQuery = {
    startDate: number
    endDate: number
}

export type EtsySalesDashboardState = {
    startDate: number
    endDate: number
    loading: boolean
    dashboardData: DashboardData
}

export const SLICE_NAME = 'etsySalesDashboard'

export const getWebsiteSalesDashboardData = createAsyncThunk(
    SLICE_NAME + '/getEtsySalesDashboardData',
    async (params: DashboardQuery) => {
        const response = await apiGetWebsiteSalesDashboardData<DashboardDataResponse, DashboardQuery>(params)
        return response.data
    },
)

const now = dayjs()
let startOfWeek = now.startOf('week').add(1, 'day')  // Monday
const endOfWeek = now            // Sunday
const todayIsMonday = now.day() === 1
startOfWeek = todayIsMonday ? now.startOf('day') : startOfWeek

const initialState: EtsySalesDashboardState = {
    startDate: startOfWeek.unix(),
    endDate: endOfWeek.unix(),
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
            .addCase(getWebsiteSalesDashboardData.fulfilled, (state, action) => {
                state.dashboardData = action.payload
                state.loading = false
            })
            .addCase(getWebsiteSalesDashboardData.pending, (state) => {
                state.loading = true
            })
    },
})

export const { setStartDate, setEndDate } = websiteSalesDashboardSlice.actions

export default websiteSalesDashboardSlice.reducer
