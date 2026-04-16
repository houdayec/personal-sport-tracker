import { useCallback, useEffect, useMemo, useState } from 'react'
import { listActiveExercises } from '@/features/fitness/training/services/exerciseService'
import { getExerciseProgress } from '@/features/fitness/progress/services/exerciseProgressService'
import type { Exercise } from '@/features/fitness/training/types/exercise'
import type {
    ExerciseProgressMetric,
    ExerciseProgressPoint,
} from '@/features/fitness/progress/types/exerciseProgress'
import { useAppSelector } from '@/store'

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useExerciseProgress = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [exercises, setExercises] = useState<Exercise[]>([])
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
    const [metric, setMetric] = useState<ExerciseProgressMetric>('weight')
    const [points, setPoints] = useState<ExerciseProgressPoint[]>([])
    const [isLoadingExercises, setIsLoadingExercises] = useState(true)
    const [isLoadingProgress, setIsLoadingProgress] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadExercises = useCallback(async () => {
        setIsLoadingExercises(true)
        setError(null)

        try {
            if (!uid) {
                throw new Error('Utilisateur non connecté.')
            }

            const activeExercises = await listActiveExercises(uid)
            setExercises(activeExercises)

            if (activeExercises.length > 0) {
                setSelectedExerciseId((previous) => {
                    if (
                        previous &&
                        activeExercises.some((exercise) => exercise.id === previous)
                    ) {
                        return previous
                    }

                    return activeExercises[0].id
                })
            } else {
                setSelectedExerciseId('')
                setPoints([])
            }
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setExercises([])
            setSelectedExerciseId('')
            setPoints([])
        } finally {
            setIsLoadingExercises(false)
        }
    }, [uid])

    const loadProgress = useCallback(async () => {
        if (!uid || !selectedExerciseId) {
            setPoints([])
            return
        }

        setIsLoadingProgress(true)
        setError(null)

        try {
            const progressPoints = await getExerciseProgress(uid, selectedExerciseId)
            setPoints(progressPoints)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setPoints([])
        } finally {
            setIsLoadingProgress(false)
        }
    }, [selectedExerciseId, uid])

    useEffect(() => {
        loadExercises()
    }, [loadExercises])

    useEffect(() => {
        loadProgress()
    }, [loadProgress])

    const selectedExercise = useMemo(() => {
        return exercises.find((exercise) => exercise.id === selectedExerciseId) || null
    }, [exercises, selectedExerciseId])

    const chartPoints = useMemo(() => {
        return points.map((point) => ({
            date: point.date,
            value: metric === 'weight' ? point.weight : point.reps,
        }))
    }, [metric, points])

    return {
        exercises,
        selectedExercise,
        selectedExerciseId,
        metric,
        points,
        chartPoints,
        isLoadingExercises,
        isLoadingProgress,
        error,
        setSelectedExerciseId,
        setMetric,
        reloadExercises: loadExercises,
        reloadProgress: loadProgress,
    }
}

export default useExerciseProgress
