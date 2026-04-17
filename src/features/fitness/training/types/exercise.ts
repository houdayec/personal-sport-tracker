import type { Timestamp } from 'firebase/firestore'

export const EXERCISE_SCHEMA_VERSION = 1 as const

export type ExerciseSource = 'global' | 'user'

export interface ExerciseInput {
    name: string
    muscleGroup: string
    equipment: string
}

export interface ExerciseSnapshot extends ExerciseInput {}

export interface ExerciseFirestoreDocument extends ExerciseInput {
    isArchived: boolean
    createdAt: Timestamp | null
    updatedAt: Timestamp | null
    schemaVersion: number
}

export interface Exercise extends ExerciseFirestoreDocument {
    id: string
    exerciseSource: ExerciseSource
}

export interface ExerciseReference {
    exerciseSource: ExerciseSource
    exerciseId: string | null
    exerciseSnapshot: ExerciseSnapshot
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
