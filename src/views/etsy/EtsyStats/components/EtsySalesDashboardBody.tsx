import { useEffect } from 'react'
import Loading from '@/components/shared/Loading'
import Statistic from './Statistic'
import SalesReport from './SalesReport'
import SalesByCategories from './SalesByCategories'
import LatestOrder from './LatestOrder'
import TopProduct from './TopProduct'
import { getEtsySalesDashboardData, useAppSelector } from '../store'
import { useAppDispatch } from '@/store'
import SalesReportBars from './SalesReportBars'

const EtsySalesDashboardBody = () => {
    const dispatch = useAppDispatch()

    const dashboardData = useAppSelector(
        (state) => state.etsySalesDashboard.data.dashboardData,
    )

    const loading = useAppSelector((state) => state.etsySalesDashboard.data.loading)
    const startDate = useAppSelector(
        (state) => state.etsySalesDashboard.data.startDate,
    )
    const endDate = useAppSelector((state) => state.etsySalesDashboard.data.endDate)

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchData = () => {
        dispatch(getEtsySalesDashboardData({ startDate, endDate }))
    }

    return (
        <Loading loading={loading}>
            <Statistic data={dashboardData?.statisticData} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SalesReport
                    data={dashboardData?.salesReportData}
                    className="col-span-2"
                />
                <SalesByCategories
                    data={dashboardData?.salesByCategoriesData}
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SalesReportBars
                    data={dashboardData?.productsSoldChartData}
                    className="lg:col-span-2"
                />
                <TopProduct data={dashboardData?.topProductsData} />
            </div>
        </Loading>
    )
}

export default EtsySalesDashboardBody
