import { useEffect } from 'react'
import Loading from '@/components/shared/Loading'
import Statistic from './RevenueStatistic'
import RevenueReport from './RevenueReport'
import SalesByCategories from './SalesByCategories'
import LatestOrder from './LatestOrder'
import TopProduct from './TopProduct'
import { getRevenueDashboardData, useAppSelector } from '../store'
import { useAppDispatch } from '@/store'
import RevenueReportBars from './SalesReportBars'
import RevenueReportPlot from './RevenueReportPlot'
import { COLOR_1, COLOR_2, COLOR_4, COLORS } from '@/constants/chart.constant'
import { FaEtsy, FaWordpress } from 'react-icons/fa'

const RevenueDashboardBody = () => {
    const dispatch = useAppDispatch()

    const dashboardData = useAppSelector(
        (state) => state.revenueDashboard.data.dashboardData,
    )

    const loading = useAppSelector((state) => state.revenueDashboard.data.loading)
    const startDate = useAppSelector(
        (state) => state.revenueDashboard.data.startDate,
    )
    const endDate = useAppSelector((state) => state.revenueDashboard.data.endDate)

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchData = () => {
        dispatch(getRevenueDashboardData({ startDate, endDate }))
    }

    return (
        <Loading loading={loading}>
            <h2 className="text-lg font-semibold">All channels</h2>
            <Statistic
                data={{
                    totalRevenue: parseFloat(
                        (
                            (dashboardData?.etsyStatisticData?.totalRevenue || 0) +
                            (dashboardData?.stripeStatisticData?.totalRevenue || 0)
                        ).toFixed(2)
                    ),
                    averageDailyRevenue: parseFloat(
                        (
                            (dashboardData?.etsyStatisticData?.averageDailyRevenue || 0) +
                            (dashboardData?.stripeStatisticData?.averageDailyRevenue || 0)
                        ).toFixed(2)
                    ),
                    averageWeeklyRevenue: parseFloat(
                        (
                            (dashboardData?.etsyStatisticData?.averageWeeklyRevenue || 0) +
                            (dashboardData?.stripeStatisticData?.averageWeeklyRevenue || 0)
                        ).toFixed(2)
                    ),
                }}
            />
            <RevenueReportPlot
                data={{
                    series: [
                        ...(dashboardData?.etsyRevenueData?.series || []),
                        ...(dashboardData?.stripeRevenueData?.series || [])
                    ],
                    categories: dashboardData?.etsyRevenueData?.categories || []
                }}
                className="col-span-3"
            />
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <FaEtsy className="text-orange-500 text-xl" />
                Etsy
            </h2>            <Statistic data={dashboardData?.etsyStatisticData} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <RevenueReport
                    data={dashboardData?.etsyRevenueData}
                    className="col-span-3"
                    colors={[COLOR_1, COLOR_2]}
                />

            </div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <FaWordpress className="text-blue-600 text-xl" />
                Website
            </h2>            <Statistic data={dashboardData?.stripeStatisticData} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <RevenueReport
                    data={dashboardData?.stripeRevenueData}
                    className="col-span-3"
                    colors={[COLOR_2, COLOR_1]}
                />
            </div>
        </Loading>
    )
}

export default RevenueDashboardBody
