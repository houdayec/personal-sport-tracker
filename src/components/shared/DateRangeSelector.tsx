import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import { HiOutlineCalendar } from 'react-icons/hi'

const { DatePickerRange } = DatePicker

export type RangePreset =
    | 'week'
    | 'month'
    | 'last30'
    | 'quarter'
    | 'last365'
    | 'year'
    | 'all'
    | 'custom'

export type RangeOption = { label: string; value: RangePreset }

export const STANDARD_RANGE_PRESETS: RangeOption[] = [
    { label: 'This Month', value: 'month' },
    { label: 'Last 30 days', value: 'last30' },
    { label: 'Last 90 days', value: 'quarter' },
    { label: 'Last 365 days', value: 'last365' },
    { label: 'Custom year', value: 'year' },
    { label: 'All Time', value: 'all' },
    { label: 'Custom range', value: 'custom' },
]

type DateRangeSelectorProps = {
    startDate: number
    endDate: number
    onRangeChange: (startUnix: number, endUnix: number) => void
    presets: RangeOption[]
    initialPreset?: RangePreset
    minYear?: number
    dateFormat?: string
    className?: string
}

const getRangeFromPreset = (
    preset: RangePreset,
    minYear: number,
    year?: number,
) => {
    const now = dayjs()
    const startOfWeek = now.startOf('week').add(1, 'day')
    const todayIsMonday = now.day() === 1

    const ranges: Record<
        Exclude<RangePreset, 'custom'>,
        [dayjs.Dayjs, dayjs.Dayjs]
    > = {
        week: todayIsMonday
            ? [now.startOf('day'), now.endOf('day')]
            : [startOfWeek, startOfWeek.add(6, 'day')],
        month: [now.startOf('month'), now],
        last30: [now.subtract(30, 'day'), now],
        quarter: [now.subtract(90, 'day'), now],
        last365: [now.subtract(365, 'day'), now],
        year: year
            ? [dayjs(`${year}-01-01`), dayjs(`${year}-12-31`)]
            : [now.startOf('year'), now],
        all: [dayjs(`${minYear}-01-01`), now],
    }

    return ranges[preset as Exclude<RangePreset, 'custom'>]
}

const DateRangeSelector = ({
    startDate,
    endDate,
    onRangeChange,
    presets,
    initialPreset,
    minYear = 2022,
    dateFormat = 'MMM DD, YYYY',
    className,
}: DateRangeSelectorProps) => {
    const initialValue = useMemo(() => {
        if (initialPreset && presets.some((p) => p.value === initialPreset)) {
            return initialPreset
        }
        return presets[0]?.value ?? 'month'
    }, [initialPreset, presets])

    const [rangeType, setRangeType] = useState<RangePreset>(initialValue)
    const [selectedYear, setSelectedYear] = useState<number | null>(null)
    const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([
        null,
        null,
    ])
    const onRangeChangeRef = useRef(onRangeChange)

    useEffect(() => {
        onRangeChangeRef.current = onRangeChange
    }, [onRangeChange])

    const maxDate = useMemo(() => dayjs().startOf('day').toDate(), [])
    const showYear =
        rangeType === 'year' && presets.some((p) => p.value === 'year')
    const showCustom =
        rangeType === 'custom' && presets.some((p) => p.value === 'custom')

    const availableYears = useMemo(() => {
        const years: { label: string; value: number }[] = []
        for (let y = minYear; y <= dayjs().year(); y++) {
            years.push({ label: y.toString(), value: y })
        }
        return years
    }, [minYear])

    const toDateSafe = (unixValue: number) => {
        if (!Number.isFinite(unixValue)) return null
        const date = dayjs.unix(unixValue).toDate()
        return Number.isNaN(date.getTime()) ? null : date
    }

    const normalizeDate = (value: Date | null | undefined) => {
        if (!value) return null
        return Number.isNaN(value.getTime()) ? null : value
    }

    useEffect(() => {
        if (rangeType === 'custom') {
            setCustomRange([
                normalizeDate(toDateSafe(startDate)),
                normalizeDate(toDateSafe(endDate)),
            ])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeType])

    useEffect(() => {
        if (rangeType === 'custom') return
        const [start, end] = getRangeFromPreset(
            rangeType,
            minYear,
            selectedYear ?? dayjs().year(),
        )
        onRangeChangeRef.current(start.unix(), end.unix())
    }, [rangeType, selectedYear, minYear])

    const handleDateChange = (value: [Date | null, Date | null]) => {
        const nextRange: [Date | null, Date | null] = [
            normalizeDate(value?.[0]),
            normalizeDate(value?.[1]),
        ]
        setCustomRange(nextRange)
        if (!nextRange[0] || !nextRange[1]) return
        onRangeChangeRef.current(
            dayjs(nextRange[0]).unix(),
            dayjs(nextRange[1]).unix(),
        )
    }

    return (
        <div
            className={`flex flex-col lg:flex-row lg:items-center gap-3 ${className || ''}`}
        >
            {showYear && (
                <Select
                    size="sm"
                    placeholder="Year"
                    className="w-[120px]"
                    options={availableYears}
                    value={
                        selectedYear
                            ? {
                                  value: selectedYear,
                                  label: selectedYear.toString(),
                              }
                            : null
                    }
                    onChange={(opt) => {
                        if (opt?.value) {
                            setSelectedYear(opt.value)
                        } else {
                            setSelectedYear(null)
                        }
                    }}
                />
            )}

            {showCustom && (
                <DatePickerRange
                    value={customRange}
                    inputFormat={dateFormat}
                    inputPrefix={<HiOutlineCalendar className="text-lg" />}
                    size="sm"
                    onChange={handleDateChange}
                    maxDate={maxDate}
                    dateViewCount={2}
                />
            )}

            <Select
                size="sm"
                placeholder="Range"
                options={presets}
                value={presets.find((opt) => opt.value === rangeType) || null}
                onChange={(opt) => {
                    if (!opt?.value) return
                    const next = opt.value as RangePreset
                    setRangeType(next)
                    if (next !== 'custom' && next !== 'year') {
                        setSelectedYear(null)
                    }
                    if (next === 'year' && selectedYear === null) {
                        setSelectedYear(dayjs().year())
                    }
                }}
            />
        </div>
    )
}

export default DateRangeSelector
