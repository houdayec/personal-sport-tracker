import type { Timestamp } from 'firebase/firestore'

export const EXERCISE_SCHEMA_VERSION = 1 as const

export interface ExerciseInput {
    name: string
    muscleGroup: string
    equipment: string
}

export interface ExerciseFirestoreDocument extends ExerciseInput {
    isArchived: boolean
    createdAt: Timestamp | null
    updatedAt: Timestamp | null
    schemaVersion: number
}

export interface Exercise extends ExerciseFirestoreDocument {
    id: string
}

export const EXERCISE_MUSCLE_GROUP_OPTIONS = [
    'Pectoraux',
    'Dos',
    'Épaules',
    'Biceps',
    'Triceps',
    'Quadriceps',
    'Ischio-jambiers',
    'Fessiers',
    'Mollets',
    'Abdominaux',
    'Corps complet',
] as const

export const EXERCISE_EQUIPMENT_OPTIONS = [
    'Poids du corps',
    'Haltères',
    'Barre',
    'Machine',
    'Kettlebell',
    'Élastique',
    'Cable',
    'TRX',
    'Autre',
] as const
