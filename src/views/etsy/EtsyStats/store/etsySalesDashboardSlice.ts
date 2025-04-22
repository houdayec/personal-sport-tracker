import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import { apigetEtsySalesDashboardData } from '@/services/SalesService'

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

export const getEtsySalesDashboardData = createAsyncThunk(
    SLICE_NAME + '/getEtsySalesDashboardData',
    async (params: DashboardQuery) => {
        const response = await apigetEtsySalesDashboardData<DashboardDataResponse, DashboardQuery>(params)
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

const etsySalesDashboardSlice = createSlice({
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
            .addCase(getEtsySalesDashboardData.fulfilled, (state, action) => {
                state.dashboardData = action.payload
                state.loading = false
            })
            .addCase(getEtsySalesDashboardData.pending, (state) => {
                state.loading = true
            })
    },
})

export const { setStartDate, setEndDate } = etsySalesDashboardSlice.actions

export default etsySalesDashboardSlice.reducer
