import DateRangeSelector, {
    STANDARD_RANGE_PRESETS,
} from '@/components/shared/DateRangeSelector'
import Button from '@/components/ui/Button'
import { HiOutlineRefresh } from 'react-icons/hi'
import { useRef, useState } from 'react'
import {
    setStartDate,
    setEndDate,
    getSalesDashboardData,
    useAppSelector,
} from '../store'
import { useAppDispatch } from '@/store'
import { apiSyncWebsiteOrdersFromWordPress } from '@/services/SalesService'
import { showToast } from '@/utils/toastUtils'

const SalesDashboardHeader = () => {
    const dispatch = useAppDispatch()
    const [syncing, setSyncing] = useState(false)
    const didInitialSyncRef = useRef(false)

    const startDate = useAppSelector((state) => state.salesDashboard.data.startDate)
    const endDate = useAppSelector((state) => state.salesDashboard.data.endDate)

    const syncWordPressRange = async (
        rangeStart: number,
        rangeEnd: number,
        showSuccessToast = false,
    ) => {
        setSyncing(true)
        try {
            const summary = await apiSyncWebsiteOrdersFromWordPress(
                rangeStart,
                rangeEnd,
            )
            await dispatch(
                getSalesDashboardData({ startDate: rangeStart, endDate: rangeEnd }),
            )
            if (showSuccessToast) {
                showToast({
                    type: 'success',
                    title: 'WordPress Sync Complete',
                    message: `${summary.written} orders synced for selected range.`,
                })
            }
            return true
        } catch (error) {
            console.error('[❌] Failed WordPress sync:', error)
            if (showSuccessToast) {
                showToast({
                    type: 'danger',
                    title: 'WordPress Sync Failed',
                    message: 'Unable to sync orders from WordPress.',
                })
            }
            return false
        } finally {
            setSyncing(false)
        }
    }

    const handleRangeChange = async (startUnix: number, endUnix: number) => {
        dispatch(setStartDate(startUnix))
        dispatch(setEndDate(endUnix))

        if (!didInitialSyncRef.current) {
            didInitialSyncRef.current = true
            const refreshed = await syncWordPressRange(startUnix, endUnix, false)
            if (refreshed) {
                return
            }
        }

        dispatch(getSalesDashboardData({ startDate: startUnix, endDate: endUnix }))
    }

    const handleSyncFromWordPress = async () => {
        await syncWordPressRange(startDate, endDate, true)
    }

    return (
        <div className="lg:flex items-center justify-between mb-4 gap-3">
            <div className="mb-4 lg:mb-0">
                <h3>Sales Overview</h3>
                <p>Track your sales graph with date filtering.</p>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <DateRangeSelector
                    startDate={startDate}
                    endDate={endDate}
                    onRangeChange={handleRangeChange}
                    presets={STANDARD_RANGE_PRESETS}
                    initialPreset="month"
                    minYear={2022}
                />
                <Button
                    size="sm"
                    variant="solid"
                    icon={<HiOutlineRefresh />}
                    loading={syncing}
                    onClick={handleSyncFromWordPress}
                >
                    Sync WordPress
                </Button>
            </div>
        </div>
    )
}

export default SalesDashboardHeader
