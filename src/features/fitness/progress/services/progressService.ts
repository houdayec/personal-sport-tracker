import dayjs from 'dayjs'
import { listBodyMeasurementEntries } from '@/features/fitness/body/services/bodyMeasurementService'
import { listBodyWeightEntries } from '@/features/fitness/body/services/bodyWeightService'
import {
    createEmptyBodyMeasurementValues,
    type BodyMeasurementEntry,
} from '@/features/fitness/body/types/bodyMeasurement'
import type { BodyWeightEntry } from '@/features/fitness/body/types/bodyWeight'
import type {
    MeasurementChartPoint,
    ProgressTrackingData,
    WeightChartPoint,
} from '@/features/fitness/progress/types/progress'

const getDateFromWeightEntry = (entry: BodyWeightEntry): Date | null => {
    const timestamp = entry.measuredAt ?? entry.createdAt ?? entry.updatedAt

    if (!timestamp) {
        return null
    }

    const date = timestamp.toDate?.()

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null
    }

    return date
}

const getDateFromMeasurementEntry = (entry: BodyMeasurementEntry): Date | null => {
    const timestamp = entry.measuredAt ?? entry.createdAt ?? entry.updatedAt

    if (!timestamp) {
        return null
    }

    const date = timestamp.toDate?.()

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null
    }

    return date
}

const sortByDateAsc = <T extends { date: Date }>(points: T[]): T[] => {
    return [...points].sort((a, b) => a.date.getTime() - b.date.getTime())
}

const transformWeightEntries = (entries: BodyWeightEntry[]): WeightChartPoint[] => {
    const points = entries
        .map((entry) => {
            const date = getDateFromWeightEntry(entry)

            if (!date) {
                return null
            }

            return {
                date,
                value: entry.weight,
                unit: entry.unit,
            }
        })
        .filter((point): point is WeightChartPoint => point !== null)

    return sortByDateAsc(points)
}

const transformMeasurementEntries = (
    entries: BodyMeasurementEntry[],
): MeasurementChartPoint[] => {
    const points = entries
        .map((entry) => {
            const date = getDateFromMeasurementEntry(entry)

            if (!date) {
                return null
            }

            return {
                date,
                unit: entry.unit,
                ...createEmptyBodyMeasurementValues(),
                ...entry.values,
            }
        })
        .filter((point): point is MeasurementChartPoint => point !== null)

    return sortByDateAsc(points)
}

export const getProgressTrackingData = async (
    uid: string,
): Promise<ProgressTrackingData> => {
    const [weightEntries, measurementEntries] = await Promise.all([
        listBodyWeightEntries(uid),
        listBodyMeasurementEntries(uid),
    ])

    return {
        weight: transformWeightEntries(weightEntries),
        measurements: transformMeasurementEntries(measurementEntries),
    }
}

export const filterPointsByTimeRange = <T extends { date: Date }>(
    points: T[],
    range: '30' | '90' | 'all',
): T[] => {
    if (range === 'all') {
        return points
    }

    const now = dayjs()
    const fromDate = now.subtract(Number(range), 'day').startOf('day')

    return points.filter((point) => dayjs(point.date).isAfter(fromDate))
}
