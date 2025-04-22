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
        revenue?: {
            value: number
            growShrink: number
        }
        orders?: {
            value: number
            growShrink: number
        }
        dailyOrderAverage?: {
            value: number
            growShrink: number
        }
    }
}

const StatisticCard = ({
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
                    <p>
                        vs. 3 months prior to{' '}
                        <span className="font-semibold">
                            {dayjs(date).format('DD MMM')}
                        </span>
                    </p>
                </div>
                <GrowShrinkTag value={data.growShrink} suffix="%" />
            </div>
        </Card>
    )
}

const Statistic = ({ data = {} }: StatisticProps) => {
    const startDate = useAppSelector(
        (state) => state.etsySalesDashboard.data.startDate,
    )

    return (
        <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:gap-4">
            <StatisticCard data={data.orders} label="Orders" date={startDate} />
            <StatisticCard
                data={data.revenue}
                valuePrefix="$"
                label="Gross Revenue"
                date={startDate}
            />
            <StatisticCard
                data={data.dailyOrderAverage}
                valueSuffix=" orders / day"
                label="Daily Order Average"
                date={startDate}
            />
        </div>
    )

}

export default Statistic
