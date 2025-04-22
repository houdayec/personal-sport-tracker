import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import {
    setStartDate,
    setEndDate,
    getEtsySalesDashboardData,
    useAppSelector,
} from '../store'
import { useAppDispatch } from '@/store'
import { HiOutlineCalendar, HiOutlineFilter } from 'react-icons/hi'
import dayjs from 'dayjs'

const dateFormat = 'MMM DD, YYYY'

const { DatePickerRange } = DatePicker

import Segment from '@/components/ui/Segment'
import { useState, useEffect } from 'react'

// ⏳ Returns [startDate, endDate] for a selected period
const getRangeFromPreset = (preset: 'week' | 'month' | 'year') => {
    const now = dayjs()
    const startOfWeek = now.startOf('week').add(1, 'day')  // Monday
    const endOfWeek = startOfWeek.add(6, 'day')            // Sunday
    const todayIsMonday = now.day() === 1

    const ranges = {
        week: todayIsMonday ? [now.startOf('day'), now.endOf('day')] : [startOfWeek, startOfWeek.add(6, 'day')],
        month: [now.startOf('month'), now],
        year: [now.startOf('year'), now],
    }

    return ranges[preset]
}


const EtsySalesDashboardHeader = () => {
    const dispatch = useAppDispatch()
    const [rangeType, setRangeType] = useState<'week' | 'month' | 'year'>('week')

    const startDate = useAppSelector((state) => state.etsySalesDashboard.data.startDate)
    const endDate = useAppSelector((state) => state.etsySalesDashboard.data.endDate)

    const maxDate = dayjs().startOf('day').toDate()

    // 🔁 When rangeType changes, update date range
    useEffect(() => {
        // Don't trigger on initial render if already loaded
        const [start, end] = getRangeFromPreset(rangeType)

        // Update Redux state
        dispatch(setStartDate(start.unix()))
        dispatch(setEndDate(end.unix()))

        // Fetch immediately on segment switch
        dispatch(getEtsySalesDashboardData({
            startDate: start.unix(),
            endDate: end.unix()
        }))
    }, [rangeType]) // 👈 Only run on segment change


    const handleDateChange = (value: [Date | null, Date | null]) => {
        dispatch(setStartDate(dayjs(value[0]).unix()))
        dispatch(setEndDate(dayjs(value[1]).unix()))
    }

    const onFilter = () => {
        console.log('Filtering data...')
        dispatch(getEtsySalesDashboardData({ startDate, endDate }))
    }

    return (
        <div className="lg:flex items-center justify-between mb-4 gap-3">
            <div className="mb-4 lg:mb-0">
                <h3>Sales Overview</h3>
                <p>View your current sales & summary</p>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-[300px]">
                    <Segment
                        size="sm"
                        value={rangeType}
                        onChange={(val) => {
                            const typedVal = val as 'week' | 'month' | 'year'
                            if (typedVal !== rangeType) setRangeType(typedVal)
                        }}
                    >
                        <Segment.Item value="week">This Week</Segment.Item>
                        <Segment.Item value="month">This Month</Segment.Item>
                        <Segment.Item value="year">This Year</Segment.Item>
                    </Segment>
                </div>
                <DatePickerRange
                    value={[
                        dayjs.unix(startDate).toDate(),
                        dayjs.unix(endDate).toDate(),
                    ]}
                    inputFormat={dateFormat}
                    inputPrefix={<HiOutlineCalendar className="text-lg" />}
                    size="sm"
                    onChange={handleDateChange}
                    maxDate={maxDate}
                    dateViewCount={2}
                />
                <Button size="sm" icon={<HiOutlineFilter />} onClick={onFilter}>
                    Filter
                </Button>
            </div>
        </div>
    )
}


export default EtsySalesDashboardHeader
