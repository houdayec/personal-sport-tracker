import type { Timestamp } from 'firebase/firestore'
import type {
    ExerciseReference,
    ExerciseSource,
} from '@/features/fitness/training/types/exercise'

export const WORKOUT_SESSION_SCHEMA_VERSION = 1 as const
export const WORKOUT_TEMPLATE_SCHEMA_VERSION = 1 as const

export type SessionType = 'strength' | 'hiit' | 'running' | 'breathing'
export type WorkoutSessionStatus = 'in_progress' | 'completed'

export type PerformedExerciseStatus = 'not_started' | 'in_progress' | 'completed'

export interface TemplateWorkoutSet {
    setNumber: number
    targetReps?: string
    targetWeight?: string
}

export interface WorkoutTemplateExercise {
    exerciseSource?: ExerciseSource
    exerciseId?: string | null
    exerciseSnapshot?: ExerciseReference['exerciseSnapshot']
    name: string
    muscleGroup?: string
    equipment?: string
    plannedSets: TemplateWorkoutSet[]
}

export type HiitFormat = 'interval' | 'circuit'
export type RunningType = string

export interface StrengthTemplateConfig {
    exercises: WorkoutTemplateExercise[]
}

export interface HiitTemplateConfig {
    format: HiitFormat
    rounds: number
    workSec: number
    restSec: number
    restBetweenRoundsSec?: number
    exercises: string[]
}

export interface RunningTemplateConfig {
    runType: RunningType
    targetDistanceKm?: number
    targetDurationMin?: number
}

export interface WorkoutTemplateInput {
    name: string
    tags: string[]
    sessionType: SessionType
    description?: string
    isArchived?: boolean
    exercises: WorkoutTemplateExercise[]
    strengthConfig?: StrengthTemplateConfig
    hiitConfig?: HiitTemplateConfig
    runningConfig?: RunningTemplateConfig
}

export interface WorkoutTemplateDocument {
    name: string
    sessionType: SessionType
    description?: string
    isArchived?: boolean
    tags?: string[]
    exercises?: WorkoutTemplateExercise[]
    strengthConfig?: StrengthTemplateConfig
    hiitConfig?: HiitTemplateConfig
    runningConfig?: RunningTemplateConfig
    schemaVersion?: number
    createdAt?: Timestamp | null
    updatedAt?: Timestamp | null
}

export interface WorkoutTemplate extends WorkoutTemplateDocument {
    id: string
}

export interface PlannedWorkoutExercise {
    plannedExerciseId: string
    exerciseSource: ExerciseSource
    exerciseId: string | null
    exerciseSnapshot: ExerciseReference['exerciseSnapshot']
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
    exerciseSource: ExerciseSource
    exerciseId: string | null
    exerciseSnapshot: ExerciseReference['exerciseSnapshot']
    name: string
    status: Exclude<PerformedExerciseStatus, 'not_started'>
    sets: PerformedWorkoutSet[]
    notes: string
}

export interface WorkoutSessionSourceTemplate {
    id: string
    name: string
    version: number
    sessionType?: SessionType
}

export interface StrengthSessionData {
    plannedExercises: PlannedWorkoutExercise[]
    performedExercises: Record<string, PerformedWorkoutExercise>
    performedExerciseIds: string[]
}

export interface HiitSessionData {
    format: HiitFormat
    rounds: number
    workSec: number
    restSec: number
    restBetweenRoundsSec?: number
    exercises: string[]
    completedRounds: number
    completedExerciseNames: string[]
    notes?: string
}

export interface RunningSessionData {
    runType: RunningType
    targetDistanceKm?: number
    targetDurationMin?: number
    distanceKm?: number
    durationSec?: number
    avgPaceSecPerKm?: number
    gpxData?: RunningGpxData
    notes?: string
}

export interface BreathingSessionData {
    inhaleSec: number
    exhaleSec: number
    durationSec: number
    elapsedSec: number
    completedCycles: number
    notes?: string
}

export interface RunningGpxTrackPoint {
    lat: number
    lon: number
    distanceKm: number
    elapsedSec: number
    eleM?: number
    timeMs?: number
}

export interface RunningGpxSummary {
    originalPointCount: number
    storedPointCount: number
    distanceKm: number
    durationSec: number
    avgPaceSecPerKm?: number
    elevationGainM?: number
    elevationLossM?: number
    minElevationM?: number
    maxElevationM?: number
}

export interface RunningGpxData {
    fileName: string
    uploadedAtMs: number
    summary: RunningGpxSummary
    points: RunningGpxTrackPoint[]
}

export interface WorkoutSessionDocument {
    sessionType: SessionType
    status: WorkoutSessionStatus
    startedAt: Timestamp | null
    endedAt?: Timestamp | null
    completedAt?: Timestamp | null
    // Backward-compatible strength fields kept at root for existing UI paths.
    plannedExercises: PlannedWorkoutExercise[]
    performedExercises: Record<string, PerformedWorkoutExercise>
    performedExerciseIds: string[]
    strengthData?: StrengthSessionData
    hiitData?: HiitSessionData
    runningData?: RunningSessionData
    breathingData?: BreathingSessionData
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
    exerciseSource: ExerciseSource
    exerciseId: string | null
    exerciseSnapshot: ExerciseReference['exerciseSnapshot']
    name: string
    sets: PerformedWorkoutSet[]
    notes: string
    status?: Exclude<PerformedExerciseStatus, 'not_started'>
}

export interface UpdateHiitSessionInput {
    completedRounds?: number
    completedExerciseNames?: string[]
    notes?: string
}

export interface UpdateRunningSessionInput {
    distanceKm?: number
    durationSec?: number
    avgPaceSecPerKm?: number
    gpxData?: RunningGpxData | null
    notes?: string
}

export interface CreateBreathingSessionInput {
    inhaleSec?: number
    exhaleSec?: number
    durationSec?: number
}

export interface UpdateBreathingSessionInput {
    elapsedSec?: number
    completedCycles?: number
    notes?: string
}

export interface CreatePastWorkoutSessionInput {
    sessionType: SessionType
    startedAt: Date | string
    durationMin: number
    sourceName?: string
    notes?: string
    strengthExerciseCount?: number
    hiitRounds?: number
    hiitExerciseCount?: number
    runningType?: RunningType
    distanceKm?: number
    breathingCompletedCycles?: number
}
