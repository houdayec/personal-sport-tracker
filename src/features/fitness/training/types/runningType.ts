import type { Timestamp } from 'firebase/firestore'

export const RUNNING_TYPE_SCHEMA_VERSION = 1 as const

export interface GlobalRunningTypeDocument {
    name: string
    nameEn: string
    description: string
    defaultGoal: string
    muscleGroup: string
    category: string
    isArchived: boolean
    createdAt?: Timestamp | null
    updatedAt?: Timestamp | null
    schemaVersion?: number
}

export interface GlobalRunningType extends GlobalRunningTypeDocument {
    id: string
}

