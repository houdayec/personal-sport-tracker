import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store'
import { logFitnessErrorDev } from '@/features/fitness/common/utils/debugError'
import {
    BODY_MEASUREMENT_FIELDS,
    type BodyMeasurementFieldKey,
} from '@/features/fitness/body/types/bodyMeasurement'
import {
    filterPointsByTimeRange,
    getProgressTrackingData,
} from '@/features/fitness/progress/services/progressService'
import type {
    MeasurementChartPoint,
    ProgressTimeRange,
    WeightChartPoint,
} from '@/features/fitness/progress/types/progress'

const getErrorMessage = (error: unknown): string => {
    logFitnessErrorDev('useProgressTracking', error)

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useProgressTracking = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [weightPoints, setWeightPoints] = useState<WeightChartPoint[]>([])
    const [measurementPoints, setMeasurementPoints] = useState<MeasurementChartPoint[]>([])
    const [timeRange, setTimeRange] = useState<ProgressTimeRange>('90')
    const [selectedMeasurement, setSelectedMeasurement] =
        useState<BodyMeasurementFieldKey>('waist')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (!uid) {
                throw new Error('Utilisateur non connecté.')
            }

            const data = await getProgressTrackingData(uid)
            setWeightPoints(data.weight)
            setMeasurementPoints(data.measurements)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setWeightPoints([])
            setMeasurementPoints([])
        } finally {
            setIsLoading(false)
        }
    }, [uid])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredWeightPoints = useMemo(() => {
        return filterPointsByTimeRange(weightPoints, timeRange)
    }, [timeRange, weightPoints])

    const filteredMeasurementPoints = useMemo(() => {
        return filterPointsByTimeRange(measurementPoints, timeRange)
    }, [measurementPoints, timeRange])

    const selectedMeasurementMeta = useMemo(() => {
        return (
            BODY_MEASUREMENT_FIELDS.find((field) => field.key === selectedMeasurement) ||
            BODY_MEASUREMENT_FIELDS[0]
        )
    }, [selectedMeasurement])

    const selectedMeasurementSeries = useMemo(() => {
        return filteredMeasurementPoints
            .map((point) => {
                const value = point[selectedMeasurement]

                if (value === null || typeof value !== 'number') {
                    return null
                }

                return {
                    date: point.date,
                    value,
                    unit: point.unit,
                }
            })
            .filter(
                (
                    point,
                ): point is { date: Date; value: number; unit: MeasurementChartPoint['unit'] } =>
                    point !== null,
            )
    }, [filteredMeasurementPoints, selectedMeasurement])

    return {
        timeRange,
        selectedMeasurement,
        selectedMeasurementMeta,
        weightPoints: filteredWeightPoints,
        measurementPoints: filteredMeasurementPoints,
        selectedMeasurementSeries,
        isLoading,
        error,
        setTimeRange,
        setSelectedMeasurement,
        reload: loadData,
    }
}

export default useProgressTracking
