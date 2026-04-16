import type {
    BodyMeasurementFieldKey,
    BodyMeasurementUnit,
    BodyMeasurementValues,
} from '@/features/fitness/body/types/bodyMeasurement'
import type { BodyWeightUnit } from '@/features/fitness/body/types/bodyWeight'

export type ProgressTimeRange = '30' | '90' | 'all'

export interface WeightChartPoint {
    date: Date
    value: number
    unit: BodyWeightUnit
}

export type MeasurementChartPoint = {
    date: Date
    unit: BodyMeasurementUnit
} & BodyMeasurementValues

export interface ProgressTrackingData {
    weight: WeightChartPoint[]
    measurements: MeasurementChartPoint[]
}

export interface MeasurementSeriesPayload {
    field: BodyMeasurementFieldKey
    points: MeasurementChartPoint[]
}
