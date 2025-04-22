import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import Radio from '@/components/ui/Radio'
import { COLORS } from '@/constants/chart.constant'

type SalesReportProps = {
    data?: {
        series?: {
            name: string
            data: number[]
        }[]
        categories?: string[]
    }
    className?: string
}

const SalesReport = ({ className, data = {} }: SalesReportProps) => {
    const [selectedSeries, setSelectedSeries] = useState<'both' | 'sales' | 'revenue'>('both')

    const handleChange = (value: 'both' | 'sales' | 'revenue') => {
        setSelectedSeries(value)
    }

    const filteredSeries = () => {
        console.log(data.series)
        if (!data.series) return []
        switch (selectedSeries) {
            case 'sales':
                return data.series.filter(s => s.name.toLowerCase().includes('order'))
            case 'revenue':
                return data.series.filter(s => s.name.toLowerCase().includes('revenue'))
            default:
                return data.series
        }
    }

    const getColors = () => {
        if (selectedSeries === 'sales') return [COLORS[0]]
        if (selectedSeries === 'revenue') return [COLORS[1]]
        return [COLORS[0], COLORS[1]]
    }

    return (
        <Card className={className}>
            <div className="flex items-center justify-between mb-4">
                <h4>Sales Report</h4>
                <Radio.Group value={selectedSeries} onChange={handleChange}>
                    <Radio value="both">Both</Radio>
                    <Radio value="sales">Sales</Radio>
                    <Radio value="revenue">Revenue</Radio>
                </Radio.Group>
            </div>
            <Chart
                series={filteredSeries()}
                xAxis={data.categories}
                height="380px"
                type="area"
                customOptions={{
                    chart: { type: 'line', zoom: { enabled: false } },
                    dataLabels: { enabled: false },
                    stroke: { curve: 'smooth', width: 3 },
                    colors: getColors(),
                    xaxis: {
                        categories: data.categories || [],
                        title: { text: 'Date' },
                    },
                    yaxis: { title: { text: 'Count / Revenue' } },
                    legend: { show: true, position: 'top' },
                }}
            />
        </Card>
    )
}

export default SalesReport
