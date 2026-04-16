import {
    getDocs,
    query,
    where,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { fitnessCollections } from '@/features/fitness/common/services'
import type {
    PerformedWorkoutExercise,
    PerformedWorkoutSet,
    WorkoutSessionDocument,
} from '@/features/fitness/training/types/workoutSession'
import type { ExerciseProgressPoint } from '@/features/fitness/progress/types/exerciseProgress'

const parseNumericValue = (value: string): number => {
    if (!value) {
        return 0
    }

    const normalized = value.replace(',', '.')
    const match = normalized.match(/-?\d+(\.\d+)?/)

    if (!match) {
        return 0
    }

    const parsed = Number(match[0])

    if (!Number.isFinite(parsed)) {
        return 0
    }

    return parsed
}

const extractDate = (session: WorkoutSessionDocument): Date | null => {
    const timestamp = session.startedAt || session.createdAt || session.updatedAt

    if (!timestamp) {
        return null
    }

    const date = timestamp.toDate?.()

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null
    }

    return date
}

const getPerformedExercisesFromSession = (
    session: WorkoutSessionDocument,
): PerformedWorkoutExercise[] => {
    const rawPerformed =
        session.performedExercises && typeof session.performedExercises === 'object'
            ? session.performedExercises
            : {}

    return Object.values(rawPerformed)
}

const collectSets = (exercises: PerformedWorkoutExercise[]): PerformedWorkoutSet[] => {
    return exercises.flatMap((exercise) =>
        Array.isArray(exercise.sets) ? exercise.sets : [],
    )
}

const createProgressPoint = (
    snapshot: QueryDocumentSnapshot<WorkoutSessionDocument>,
    exerciseId: string,
): ExerciseProgressPoint | null => {
    const session = snapshot.data()
    const date = extractDate(session)

    if (!date) {
        return null
    }

    const matchingExercises = getPerformedExercisesFromSession(session).filter(
        (exercise) => exercise.exerciseId === exerciseId,
    )

    if (!matchingExercises.length) {
        return null
    }

    const sets = collectSets(matchingExercises)

    if (!sets.length) {
        return {
            date,
            weight: 0,
            reps: 0,
            bestSetWeight: 0,
            bestSetReps: 0,
            sessionId: snapshot.id,
        }
    }

    const weights = sets.map((set) => parseNumericValue(set.weight || ''))
    const reps = sets.map((set) => parseNumericValue(set.reps || ''))

    const maxWeight = Math.max(0, ...weights)
    const totalReps = reps.reduce((sum, value) => sum + value, 0)

    const bestSet = sets.reduce(
        (best, set) => {
            const setWeight = parseNumericValue(set.weight || '')
            const setReps = parseNumericValue(set.reps || '')

            if (setWeight > best.weight) {
                return {
                    weight: setWeight,
                    reps: setReps,
                }
            }

            if (setWeight === best.weight && setReps > best.reps) {
                return {
                    weight: setWeight,
                    reps: setReps,
                }
            }

            return best
        },
        { weight: 0, reps: 0 },
    )

    return {
        date,
        weight: Number(maxWeight.toFixed(2)),
        reps: Number(totalReps.toFixed(2)),
        bestSetWeight: Number(bestSet.weight.toFixed(2)),
        bestSetReps: Number(bestSet.reps.toFixed(2)),
        sessionId: snapshot.id,
    }
}

const sortPointsByDateAsc = (points: ExerciseProgressPoint[]): ExerciseProgressPoint[] => {
    return [...points].sort((a, b) => a.date.getTime() - b.date.getTime())
}

export const getExerciseProgress = async (
    uid: string,
    exerciseId: string,
): Promise<ExerciseProgressPoint[]> => {
    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)
    const sessionsQuery = query(
        sessionsRef,
        where('performedExerciseIds', 'array-contains', exerciseId),
    )

    const snapshot = await getDocs(sessionsQuery)

    const points = snapshot.docs
        .map((session) => createProgressPoint(session, exerciseId))
        .filter((point): point is ExerciseProgressPoint => point !== null)

    return sortPointsByDateAsc(points)
}
