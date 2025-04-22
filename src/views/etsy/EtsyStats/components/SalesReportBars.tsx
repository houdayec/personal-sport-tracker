import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import { COLORS } from '@/constants/chart.constant'
import { Segment } from '@/components/ui'
import { useEffect, useState } from 'react'
import { F } from '@faker-js/faker/dist/airline-CBNP41sR'

type SalesReportProps = {
    data?: {
        series: {
            name: string
            data: number[]
        }[]
        categories: string[]
    }
    className?: string
}

// Filters the data series based on selected filter
const getFilteredSeries = (
    series: { name: string; data: number[] }[],
    filter: 'both' | 'sales' | 'revenues'
) => {
    console.log('Filter in getFilteredSeries:', filter.at(0))
    let filteredSeries = series
    if (filter.at(0) === 'both') return filteredSeries
    else {
        if (filter.at(0) === 'sales') {
            return filteredSeries.filter((s) => s.name === 'Sold')
        } else if (filter.at(0) === 'revenues') {
            return filteredSeries.filter((s) => s.name === 'Revenues')
        }
    }
    return filteredSeries

}

const SalesReportBars = ({ className, data }: SalesReportProps) => {
    if (!data || !data.categories?.length || !data.series?.length) return null

    const barHeight = 50
    const [filter, setFilter] = useState<'both' | 'sales' | 'revenues'>('both')
    const [filteredSeries, setFilteredSeries] = useState(data.series)

    // Fix: Use useEffect with proper dependencies that will actually trigger on changes
    useEffect(() => {
        console.log("Raw data received:", JSON.stringify(data))
        console.log("Series names:", data.series.map(s => s.name))
        if (data && data.series) {
            console.log("data series", data.series)
            const updated = getFilteredSeries(data.series, filter)
            setFilteredSeries(updated)
            console.log('Updated Filter:', filter, updated)
        }
    }, [filter, data])

    const chartHeight =
        filteredSeries.length > 0
            ? Math.max(...filteredSeries.map((s) => s.data.length)) * barHeight
            : barHeight * data.categories.length

    return (
        <Card className={className}>
            <div className="flex items-center justify-between">
                <h4>Products Sold</h4>
                <Segment
                    size="sm"
                    value={filter}
                    onChange={(val) => {
                        console.log("Segment clicked:", val);
                        setFilter(val as 'both' | 'sales' | 'revenues');
                    }}
                >
                    <Segment.Item value="both">Both</Segment.Item>
                    <Segment.Item value="sales">Sales</Segment.Item>
                    <Segment.Item value="revenues">Revenues</Segment.Item>
                </Segment>
            </div>

            <Chart
                type="bar"
                height={`${chartHeight}px`}
                series={filteredSeries}
                customOptions={{
                    colors: COLORS,
                    plotOptions: {
                        bar: {
                            horizontal: true,
                        },
                    },
                    xaxis: {
                        categories: data.categories,
                    },
                    dataLabels: {
                        enabled: false,
                    },
                    legend: {
                        show: false,
                    },
                }}
            />
        </Card>
    )
}

export default SalesReportBars