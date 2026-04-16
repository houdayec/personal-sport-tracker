import type { Timestamp } from 'firebase/firestore'

export const WORKOUT_SESSION_SCHEMA_VERSION = 1 as const
export const WORKOUT_TEMPLATE_SCHEMA_VERSION = 1 as const

export type WorkoutSessionStatus = 'in_progress' | 'completed'

export type PerformedExerciseStatus = 'not_started' | 'in_progress' | 'completed'

export interface TemplateWorkoutSet {
    setNumber: number
    targetReps?: string
    targetWeight?: string
}

export interface WorkoutTemplateExercise {
    exerciseId?: string | null
    name: string
    muscleGroup?: string
    equipment?: string
    plannedSets: TemplateWorkoutSet[]
}

export interface WorkoutTemplateInput {
    name: string
    tags: string[]
    exercises: WorkoutTemplateExercise[]
}

export interface WorkoutTemplateDocument {
    name: string
    tags?: string[]
    exercises: WorkoutTemplateExercise[]
    schemaVersion?: number
    createdAt?: Timestamp | null
    updatedAt?: Timestamp | null
}

export interface WorkoutTemplate extends WorkoutTemplateDocument {
    id: string
}

export interface PlannedWorkoutExercise {
    plannedExerciseId: string
    exerciseId: string | null
    name: string
    muscleGroup: string
    equipment: string
    orderIndex: number
    plannedSets: TemplateWorkoutSet[]
}

export interface PerformedWorkoutSet {
    setNumber: number
    reps: string
    weight: string
    notes?: string
}

export interface PerformedWorkoutExercise {
    plannedExerciseId: string
    exerciseId: string | null
    name: string
    status: Exclude<PerformedExerciseStatus, 'not_started'>
    sets: PerformedWorkoutSet[]
    notes: string
}

export interface WorkoutSessionSourceTemplate {
    id: string
    name: string
    version: number
}

export interface WorkoutSessionDocument {
    status: WorkoutSessionStatus
    startedAt: Timestamp | null
    endedAt?: Timestamp | null
    completedAt?: Timestamp | null
    plannedExercises: PlannedWorkoutExercise[]
    performedExercises: Record<string, PerformedWorkoutExercise>
    performedExerciseIds: string[]
    sourceTemplate?: WorkoutSessionSourceTemplate | null
    createdAt: Timestamp | null
    updatedAt: Timestamp | null
    schemaVersion: number
    // Backward compatibility with previous session docs
    templateId?: string
    templateName?: string
}

export interface WorkoutSession extends WorkoutSessionDocument {
    id: string
}

export interface SavePerformedExerciseInput {
    plannedExerciseId: string
    exerciseId: string | null
    name: string
    sets: PerformedWorkoutSet[]
    notes: string
    status?: Exclude<PerformedExerciseStatus, 'not_started'>
}
