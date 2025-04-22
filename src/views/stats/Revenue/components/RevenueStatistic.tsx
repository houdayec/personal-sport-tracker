import Card from '@/components/ui/Card'
import { NumericFormat } from 'react-number-format'
import GrowShrinkTag from '@/components/shared/GrowShrinkTag'
import { useAppSelector } from '../store'
import dayjs from 'dayjs'

type StatisticCardProps = {
    data?: {
        value: number
        growShrink: number
    }
    label: string
    valuePrefix?: string
    valueSuffix?: string
    date: number
}

type StatisticProps = {
    data?: {
        totalRevenue: number
        averageDailyRevenue: number
        averageWeeklyRevenue: number
    }
}

const RevenueStatisticCard = ({
    data = { value: 0, growShrink: 0 },
    label,
    valuePrefix,
    valueSuffix,
    date,
}: StatisticCardProps) => {
    return (
        <Card className='sm:mb-2'>
            <h6 className="font-semibold mb-4 text-sm">{label}</h6>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold">
                        <NumericFormat
                            thousandSeparator
                            displayType="text"
                            value={data.value}
                            prefix={valuePrefix}
                            suffix={valueSuffix}
                        />
                    </h3>
                </div>
                <GrowShrinkTag value={data.growShrink} suffix="%" />
            </div>
        </Card>
    )
}

const Statistic = ({
    data = {
        totalRevenue: 0,
        averageDailyRevenue: 0,
        averageWeeklyRevenue: 0,
    },
}: StatisticProps) => {
    const startDate = useAppSelector(
        (state) => state.revenueDashboard.data.startDate,
    )

    return (
        <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:gap-4">
            <RevenueStatisticCard
                data={{ value: data.totalRevenue, growShrink: 0 }}
                valuePrefix="€"
                label="Net revenue"
                date={startDate}
            />
            <RevenueStatisticCard
                data={{ value: data.averageDailyRevenue, growShrink: 0 }}
                valuePrefix="€"
                label="Daily average"
                date={startDate}
            />
            <RevenueStatisticCard
                data={{ value: data.averageWeeklyRevenue, growShrink: 0 }}
                valuePrefix="€"
                label="Weekly average"
                date={startDate}
            />
        </div>
    )
}


export default Statistic
