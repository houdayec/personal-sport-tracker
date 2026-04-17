import type { Timestamp } from 'firebase/firestore'

export const BODY_CHECKIN_SCHEMA_VERSION = 1 as const

export const BODY_CHECKIN_UNITS = ['cm', 'in'] as const
export type BodyCheckinUnit = (typeof BODY_CHECKIN_UNITS)[number]

export const BODY_CHECKIN_FIELDS = [
    { key: 'neck', label: 'Cou' },
    { key: 'shoulders', label: 'Épaules' },
    { key: 'chest', label: 'Poitrine' },
    { key: 'waist', label: 'Taille' },
    { key: 'hips', label: 'Hanches' },
    { key: 'thighLeft', label: 'Cuisse gauche' },
    { key: 'thighRight', label: 'Cuisse droite' },
    { key: 'armLeft', label: 'Bras gauche' },
    { key: 'armRight', label: 'Bras droit' },
    { key: 'calfLeft', label: 'Mollet gauche' },
    { key: 'calfRight', label: 'Mollet droit' },
] as const

export type BodyCheckinFieldKey = (typeof BODY_CHECKIN_FIELDS)[number]['key']
export type BodyCheckinValues = Record<BodyCheckinFieldKey, number | null>

export const BODY_CHECKIN_PHOTO_TYPES = ['front', 'side', 'back', 'other'] as const
export type BodyCheckinPhotoType = (typeof BODY_CHECKIN_PHOTO_TYPES)[number]

export interface BodyCheckinPhoto {
    type: BodyCheckinPhotoType
    url: string
    path?: string
}

export interface BodyCheckinInput {
    measuredAt: Date
    unit: BodyCheckinUnit
    values: BodyCheckinValues
    weight?: number
    photos?: BodyCheckinPhoto[]
    note?: string
}

export interface BodyCheckinDocument {
    measuredAt: Timestamp | null
    unit: BodyCheckinUnit
    values: BodyCheckinValues
    weight?: number
    photos?: BodyCheckinPhoto[]
    note?: string
    createdAt: Timestamp | null
    updatedAt: Timestamp | null
    schemaVersion: number
}

export interface BodyCheckin extends Omit<BodyCheckinDocument, 'photos'> {
    id: string
    photos: BodyCheckinPhoto[]
}

export interface BodyCheckinPhotoUploadInput {
    type: BodyCheckinPhotoType
    file: File
}

export const createEmptyBodyCheckinValues = (): BodyCheckinValues => {
    return BODY_CHECKIN_FIELDS.reduce<BodyCheckinValues>((acc, field) => {
        acc[field.key] = null
        return acc
    }, {} as BodyCheckinValues)
}
