import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import {
    setStartDate,
    setEndDate,
    getRevenueDashboardData,
    useAppSelector,
} from '../store'
import { useAppDispatch } from '@/store'
import { HiOutlineCalendar, HiOutlineFilter } from 'react-icons/hi'
import dayjs from 'dayjs'

const dateFormat = 'MMM DD, YYYY'

const { DatePickerRange } = DatePicker

import Segment from '@/components/ui/Segment'
import { useState, useEffect, useRef } from 'react'

// ⏳ Returns [startDate, endDate] for a selected period
const getRangeFromPreset = (preset: 'month' | 'year' | 'all') => {
    const now = dayjs()
    const ranges = {
        month: [now.startOf('month'), now],
        year: [now.startOf('year'), now],
        all: [dayjs('2022-04-07'), now], // Adjust starting point of your data
    }
    return ranges[preset]
}


const RevenueDashboardHeader = () => {
    const dispatch = useAppDispatch()
    const [rangeType, setRangeType] = useState<'month' | 'year' | 'all'>('month')

    const startDate = useAppSelector((state) => state.revenueDashboard.data.startDate)
    const endDate = useAppSelector((state) => state.revenueDashboard.data.endDate)

    const maxDate = dayjs().startOf('day').toDate()
    const hasFetchedRef = useRef(false)
    const [initialLoadDone, setInitialLoadDone] = useState(false)

    useEffect(() => {
        const [start, end] = getRangeFromPreset(rangeType)

        dispatch(setStartDate(start.unix()))
        dispatch(setEndDate(end.unix()))
        dispatch(getRevenueDashboardData({
            startDate: start.unix(),
            endDate: end.unix()
        }))
    }, [rangeType])


    const handleDateChange = (value: [Date | null, Date | null]) => {
        dispatch(setStartDate(dayjs(value[0]).unix()))
        dispatch(setEndDate(dayjs(value[1]).unix()))
    }

    const onFilter = () => {
        console.log('Filtering data...')
        dispatch(getRevenueDashboardData({ startDate, endDate }))
    }

    return (
        <div className="lg:flex items-center justify-between mb-4 gap-3">
            <div className="mb-4 lg:mb-0">
                <h3>Revenue Overview</h3>
                <p>View your revenue from Etsy and Wordpress</p>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-[300px]">
                    <Segment
                        size="sm"
                        value={rangeType}
                        onChange={(val) => {
                            const typedVal = val as 'month' | 'year' | 'all'
                            if (typedVal !== rangeType) setRangeType(typedVal)
                        }}
                    >
                        <Segment.Item value="month">This Month</Segment.Item>
                        <Segment.Item value="year">This Year</Segment.Item>
                        <Segment.Item value="all">All Time</Segment.Item>
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


export default RevenueDashboardHeader
