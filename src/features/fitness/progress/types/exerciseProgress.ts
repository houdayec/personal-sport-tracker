export type ExerciseProgressMetric = 'weight' | 'reps'

export interface ExerciseProgressPoint {
    date: Date
    weight: number
    reps: number
    bestSetWeight: number
    bestSetReps: number
    sessionId: string
}
