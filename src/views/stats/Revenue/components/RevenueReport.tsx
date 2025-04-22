import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chart from 'react-apexcharts'
import { COLOR_1, COLOR_2, COLOR_4, COLORS } from '@/constants/chart.constant'

type RevenueReportProps = {
    data?: {
        series?: {
            name: string
            data: number[]
        }[]
        categories?: string[]
    }
    className?: string
    colors?: string[]
}

const RevenueReport = ({ className, data = {}, colors = [] }: RevenueReportProps) => {
    console.log(data)
    return (
        <Card className={className}>
            <div className="flex items-center justify-between mb-4">
                <h4>Revenue Report</h4>
            </div>
            <Chart
                series={data.series}
                xaxis={data.categories}
                height="380px"
                type="area"
                options={{
                    chart: {
                        zoom: {
                            enabled: false,
                        },
                    },
                    colors: colors,
                    fill: {
                        type: 'gradient',
                        gradient: {
                            shadeIntensity: 1,
                            opacityFrom: 0.7,
                            opacityTo: 0.9,
                            stops: [0, 80, 100],
                        },
                    },
                    dataLabels: {
                        enabled: false,
                    },
                    stroke: {
                        curve: 'smooth',
                        width: 3,
                    },
                    xaxis: {
                        categories: data.categories || [],
                        title: { text: 'Date' },
                    },
                    yaxis: {
                        title: { text: 'Revenue €' },
                    },
                    legend: {
                        show: true,
                        position: 'top',
                    },
                }}
            />
        </Card>
    )
}

export default RevenueReport
