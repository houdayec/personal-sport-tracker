import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store'
import {
    finishWorkoutSession,
    getCurrentWorkoutSession,
    listWorkoutTemplates,
    markExerciseCompleted,
    createWorkoutSessionFromTemplate,
    updatePerformedExercise,
} from '@/features/fitness/training/services/workoutSessionService'
import type {
    SavePerformedExerciseInput,
    WorkoutSession,
    WorkoutTemplate,
} from '@/features/fitness/training/types/workoutSession'

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const uniq = (values: string[]): string[] => {
    return Array.from(new Set(values))
}

const useWorkoutTodaySession = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isStarting, setIsStarting] = useState(false)
    const [isSavingExercise, setIsSavingExercise] = useState(false)
    const [isFinishingSession, setIsFinishingSession] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const assertUid = useCallback(() => {
        if (!uid) {
            throw new Error('Utilisateur non connecté.')
        }

        return uid
    }, [uid])

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const currentUid = assertUid()
            const [inProgressSession, templateList] = await Promise.all([
                getCurrentWorkoutSession(currentUid),
                listWorkoutTemplates(currentUid),
            ])

            setActiveSession(inProgressSession)
            setTemplates(templateList)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setTemplates([])
            setActiveSession(null)
        } finally {
            setIsLoading(false)
        }
    }, [assertUid])

    useEffect(() => {
        loadData()
    }, [loadData])

    const patchLocalPerformedExercise = useCallback(
        (
            previous: WorkoutSession | null,
            input: SavePerformedExerciseInput,
            forceStatus?: 'completed' | 'in_progress',
        ): WorkoutSession | null => {
            if (!previous || !input.plannedExerciseId) {
                return previous
            }

            const nextStatus = forceStatus || input.status || 'in_progress'

            return {
                ...previous,
                performedExercises: {
                    ...previous.performedExercises,
                    [input.plannedExerciseId]: {
                        plannedExerciseId: input.plannedExerciseId,
                        exerciseId: input.exerciseId,
                        name: input.name,
                        status: nextStatus,
                        sets: input.sets,
                        notes: input.notes,
                    },
                },
                performedExerciseIds: uniq([
                    ...previous.performedExerciseIds,
                    input.plannedExerciseId,
                ]),
            }
        },
        [],
    )

    const startSessionFromTemplate = useCallback(
        async (templateId: string) => {
            setIsStarting(true)
            setError(null)
            setSuccessMessage(null)

            try {
                const currentUid = assertUid()
                const session = await createWorkoutSessionFromTemplate(
                    currentUid,
                    templateId,
                )
                setActiveSession(session)
            } catch (startError) {
                setError(getErrorMessage(startError))
                throw startError
            } finally {
                setIsStarting(false)
            }
        },
        [assertUid],
    )

    const savePerformedExercise = useCallback(
        async (input: SavePerformedExerciseInput) => {
            if (!activeSession) {
                throw new Error('Aucune séance en cours.')
            }

            setIsSavingExercise(true)
            setError(null)
            setSuccessMessage(null)

            try {
                const currentUid = assertUid()
                await updatePerformedExercise(currentUid, activeSession.id, input)
                setActiveSession((previous) =>
                    patchLocalPerformedExercise(previous, input, 'in_progress'),
                )
            } catch (saveError) {
                setError(getErrorMessage(saveError))
                throw saveError
            } finally {
                setIsSavingExercise(false)
            }
        },
        [activeSession, assertUid, patchLocalPerformedExercise],
    )

    const completeExercise = useCallback(
        async (input: SavePerformedExerciseInput) => {
            if (!activeSession) {
                throw new Error('Aucune séance en cours.')
            }

            setIsSavingExercise(true)
            setError(null)
            setSuccessMessage(null)

            try {
                const currentUid = assertUid()
                await markExerciseCompleted(currentUid, activeSession.id, input)
                setActiveSession((previous) =>
                    patchLocalPerformedExercise(previous, input, 'completed'),
                )
            } catch (completeError) {
                setError(getErrorMessage(completeError))
                throw completeError
            } finally {
                setIsSavingExercise(false)
            }
        },
        [activeSession, assertUid, patchLocalPerformedExercise],
    )

    const finishSession = useCallback(async () => {
        if (!activeSession) {
            throw new Error('Aucune séance en cours.')
        }

        setIsFinishingSession(true)
        setError(null)

        try {
            const currentUid = assertUid()
            await finishWorkoutSession(currentUid, activeSession.id)
            setActiveSession(null)
            setSuccessMessage('Séance terminée. Elle est maintenant dans l’historique.')
        } catch (finishError) {
            setError(getErrorMessage(finishError))
            throw finishError
        } finally {
            setIsFinishingSession(false)
        }
    }, [activeSession, assertUid])

    const completedExerciseCount = useMemo(() => {
        if (!activeSession) {
            return 0
        }

        return activeSession.plannedExercises.filter((exercise) => {
            return (
                activeSession.performedExercises[exercise.plannedExerciseId]?.status ===
                'completed'
            )
        }).length
    }, [activeSession])

    return {
        templates,
        activeSession,
        completedExerciseCount,
        isLoading,
        isStarting,
        isSavingExercise,
        isFinishingSession,
        error,
        successMessage,
        loadData,
        startSessionFromTemplate,
        savePerformedExercise,
        completeExercise,
        finishSession,
    }
}

export default useWorkoutTodaySession
