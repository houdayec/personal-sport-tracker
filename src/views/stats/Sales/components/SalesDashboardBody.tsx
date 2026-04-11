import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import Loading from '@/components/shared/Loading'
import { NumericFormat } from 'react-number-format'
import { useAppSelector } from '../store'

const StatCard = ({ label, value, prefix = '' }: { label: string; value: number; prefix?: string }) => {
    return (
        <Card>
            <div className="text-sm text-gray-500 mb-2">{label}</div>
            <div className="text-2xl font-semibold">
                <NumericFormat displayType="text" value={value} thousandSeparator prefix={prefix} />
            </div>
        </Card>
    )
}

const SalesDashboardBody = () => {
    const loading = useAppSelector((state) => state.salesDashboard.data.loading)
    const dashboardData = useAppSelector((state) => state.salesDashboard.data.dashboardData)

    const revenue = dashboardData?.statisticData?.revenue?.value || 0
    const orders = dashboardData?.statisticData?.orders?.value || 0
    const avg = dashboardData?.statisticData?.dailyOrderAverage?.value || 0

    return (
        <Loading loading={loading}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <StatCard label="Revenue" value={revenue} prefix="$" />
                <StatCard label="Orders" value={orders} />
                <StatCard label="Daily Avg Orders" value={avg} />
            </div>

            <Card>
                <h4 className="mb-4">Sales Graph</h4>
                <Chart
                    type="area"
                    height={420}
                    xAxis={dashboardData?.salesReportData?.categories || []}
                    series={dashboardData?.salesReportData?.series || []}
                    customOptions={{
                        stroke: { curve: 'smooth', width: 3 },
                        dataLabels: { enabled: false },
                        yaxis: {
                            labels: {
                                formatter: (value: number) => `${Math.round(value)}`,
                            },
                        },
                    }}
                />
            </Card>
        </Loading>
    )
}

export default SalesDashboardBody
