import type { Timestamp } from 'firebase/firestore'

export const BODY_WEIGHT_SCHEMA_VERSION = 1 as const

export const BODY_WEIGHT_UNITS = ['kg', 'lb'] as const

export type BodyWeightUnit = (typeof BODY_WEIGHT_UNITS)[number]

export interface BodyWeightEntryInput {
    measuredAt: Date
    weight: number
    unit: BodyWeightUnit
    note?: string
}

export interface BodyWeightEntryDocument {
    measuredAt: Timestamp | null
    weight: number
    unit: BodyWeightUnit
    note?: string
    createdAt: Timestamp | null
    updatedAt: Timestamp | null
    schemaVersion: number
}

export interface BodyWeightEntry extends BodyWeightEntryDocument {
    id: string
}
