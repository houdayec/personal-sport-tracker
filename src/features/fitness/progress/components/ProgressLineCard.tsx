import dayjs from 'dayjs'
import { Card } from '@/components/ui'
import Chart from '@/components/shared/Chart'

interface ProgressLineCardProps {
    title: string
    subtitle: string
    points: Array<{ date: Date; value: number }>
    valueLabel: string
    emptyMessage: string
    wrapCard?: boolean
}

const ProgressLineCard = ({
    title,
    subtitle,
    points,
    valueLabel,
    emptyMessage,
    wrapCard = true,
}: ProgressLineCardProps) => {
    const content = (
        <>
            <div className="mb-2">
                <h5>{title}</h5>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
            </div>

            {points.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{emptyMessage}</p>
                </div>
            ) : (
                <Chart
                    type="line"
                    height={320}
                    xAxis={points.map((point) => dayjs(point.date).format('DD/MM'))}
                    series={[
                        {
                            name: valueLabel,
                            data: points.map((point) => point.value),
                        },
                    ]}
                    customOptions={{
                        yaxis: {
                            labels: {
                                formatter: (value: number) => `${Number(value.toFixed(1))}`,
                            },
                        },
                        tooltip: {
                            x: {
                                formatter: (_: string, options: { dataPointIndex: number }) => {
                                    const point = points[options.dataPointIndex]
                                    return point
                                        ? dayjs(point.date).format('DD/MM/YYYY')
                                        : ''
                                },
                            },
                        },
                    }}
                />
            )}
        </>
    )

    if (!wrapCard) {
        return content
    }

    if (points.length === 0) {
        return (
            <Card>
                {content}
            </Card>
        )
    }

    return (
        <Card>
            {content}
        </Card>
    )
}

export default ProgressLineCard
