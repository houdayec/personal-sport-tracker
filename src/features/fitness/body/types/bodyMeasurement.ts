import type { Timestamp } from 'firebase/firestore'

export const BODY_MEASUREMENT_SCHEMA_VERSION = 1 as const

export const BODY_MEASUREMENT_UNITS = ['cm', 'in'] as const

export type BodyMeasurementUnit = (typeof BODY_MEASUREMENT_UNITS)[number]

export const BODY_MEASUREMENT_FIELDS = [
    { key: 'neck', label: 'Cou' },
    { key: 'shoulders', label: 'Épaules' },
    { key: 'chest', label: 'Poitrine' },
    { key: 'waist', label: 'Taille' },
    { key: 'hips', label: 'Hanches' },
    { key: 'leftArm', label: 'Bras gauche' },
    { key: 'rightArm', label: 'Bras droit' },
    { key: 'leftThigh', label: 'Cuisse gauche' },
    { key: 'rightThigh', label: 'Cuisse droite' },
    { key: 'leftCalf', label: 'Mollet gauche' },
    { key: 'rightCalf', label: 'Mollet droit' },
] as const

export type BodyMeasurementFieldKey = (typeof BODY_MEASUREMENT_FIELDS)[number]['key']

export type BodyMeasurementValues = Record<BodyMeasurementFieldKey, number | null>

export interface BodyMeasurementEntryInput {
    measuredAt: Date
    unit: BodyMeasurementUnit
    values: BodyMeasurementValues
    note?: string
}

export interface BodyMeasurementEntryDocument {
    measuredAt: Timestamp | null
    unit: BodyMeasurementUnit
    values: BodyMeasurementValues
    createdAt: Timestamp | null
    updatedAt: Timestamp | null
    schemaVersion: number
    note?: string
}

export interface BodyMeasurementEntry extends BodyMeasurementEntryDocument {
    id: string
}

export const createEmptyBodyMeasurementValues = (): BodyMeasurementValues => {
    return BODY_MEASUREMENT_FIELDS.reduce<BodyMeasurementValues>((acc, field) => {
        acc[field.key] = null
        return acc
    }, {} as BodyMeasurementValues)
}
