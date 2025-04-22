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
        colors?: string[]
    }
    className?: string
}
const shouldGroupByMonth = (categories: string[] = []) => {
    console.log(categories)
    if (categories.length < 2) return false

    const parseDate = (label: string) => {
        const [day, month, year] = label.split('/')
        return new Date(Number(year), Number(month) - 1, Number(day))
    }

    const start = parseDate(categories[0])
    const end = parseDate(categories[categories.length - 1])
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())

    return monthsDiff > 12
}
const groupDataByMonth = (
    categories: string[],
    series: { name: string; data: number[] }[]
) => {
    const monthLabelsMap: Record<string, number[]> = {}

    categories.forEach((dateStr, index) => {
        const [day, month, year] = dateStr.split('/')
        const date = new Date(Number(year), Number(month) - 1, Number(day))
        const label = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        if (!monthLabelsMap[label]) monthLabelsMap[label] = []
        monthLabelsMap[label].push(index)
    })

    const newCategories = Object.keys(monthLabelsMap)
    const newSeries = series.map((s) => ({
        name: s.name,
        data: newCategories.map((label) => {
            const indices = monthLabelsMap[label]
            return indices.reduce((sum, i) => sum + s.data[i], 0)
        }),
    }))

    return { categories: newCategories, series: newSeries }
}

const RevenueReportPlot = ({ className, data = {} }: RevenueReportProps) => {

    let chartData = data

    if (shouldGroupByMonth(data.categories)) {
        console.log('grouping by month')
        chartData = groupDataByMonth(data.categories || [], data.series || [])
    }

    return (
        <Card className={className}>
            <div className="flex items-center justify-between mb-4">
                <h4>Revenue Report</h4>
            </div>
            <Chart
                series={chartData.series}
                xaxis={chartData.categories}
                height="380px"
                type="bar"
                options={{
                    plotOptions: {
                        bar: {
                            horizontal: false,
                            columnWidth: '55%',
                            borderRadius: 4,
                        },
                    },
                    colors: COLORS,
                    dataLabels: {
                        enabled: false,
                    },
                    stroke: {
                        show: true,
                        width: 2,
                        colors: ['transparent'],
                    },
                    xaxis: {
                        categories: chartData.categories || [],
                        title: { text: 'Date' },
                    },
                    fill: {
                        opacity: 1,
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

export default RevenueReportPlot
