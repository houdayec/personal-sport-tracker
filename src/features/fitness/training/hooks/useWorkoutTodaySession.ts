import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store'
import { logFitnessErrorDev } from '@/features/fitness/common/utils/debugError'
import {
    addExerciseToWorkoutSession,
    finishWorkoutSession,
    getCurrentWorkoutSession,
    listWorkoutSessionsHistory,
    listWorkoutTemplates,
    markExerciseCompleted,
    createWorkoutSessionFromTemplate,
    updateHiitSessionData,
    updatePerformedExercise,
    updateRunningSessionData,
} from '@/features/fitness/training/services/workoutSessionService'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import { listActiveExercises } from '@/features/fitness/training/services/exerciseService'
import { parseGpxFile } from '@/features/fitness/training/utils/gpx'
import type { Exercise } from '@/features/fitness/training/types/exercise'
import type {
    PlannedWorkoutExercise,
    SavePerformedExerciseInput,
    UpdateHiitSessionInput,
    UpdateRunningSessionInput,
    WorkoutSession,
    WorkoutTemplate,
} from '@/features/fitness/training/types/workoutSession'

const getErrorMessage = (error: unknown): string => {
    logFitnessErrorDev('useWorkoutTodaySession', error)

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

    const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([])
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
    const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([])
    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isStarting, setIsStarting] = useState(false)
    const [isAddingExercise, setIsAddingExercise] = useState(false)
    const [isSavingExercise, setIsSavingExercise] = useState(false)
    const [isUploadingGpx, setIsUploadingGpx] = useState(false)
    const [isFinishingSession, setIsFinishingSession] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
            const [inProgressSession, templateList, exerciseList, historyList] = await Promise.all([
                getCurrentWorkoutSession(currentUid),
                listWorkoutTemplates(currentUid),
                listActiveExercises(currentUid),
                listWorkoutSessionsHistory(currentUid),
            ])

            setActiveSession(inProgressSession)
            setTemplates(templateList)
            setExerciseOptions(exerciseList)
            setRecentSessions(
                historyList.filter((session) => session.status === 'completed').slice(0, 5),
            )
        } catch (loadError) {
            setError(getErrorMessage(loadError))
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
            if (previous.sessionType !== 'strength') {
                return previous
            }

            const nextStatus = forceStatus || input.status || 'in_progress'
            const nextPerformedExercise = {
                plannedExerciseId: input.plannedExerciseId,
                exerciseSource: input.exerciseSource,
                exerciseId: input.exerciseId,
                exerciseSnapshot: input.exerciseSnapshot,
                name: input.name,
                status: nextStatus,
                sets: input.sets,
                notes: input.notes,
            }
            const nextPerformedExerciseIds = uniq([
                ...previous.performedExerciseIds,
                input.plannedExerciseId,
                ...(input.exerciseId
                    ? [input.exerciseId, `${input.exerciseSource}:${input.exerciseId}`]
                    : []),
            ])

            return {
                ...previous,
                performedExercises: {
                    ...previous.performedExercises,
                    [input.plannedExerciseId]: nextPerformedExercise,
                },
                performedExerciseIds: nextPerformedExerciseIds,
                strengthData: {
                    plannedExercises: previous.plannedExercises,
                    performedExercises: {
                        ...previous.performedExercises,
                        [input.plannedExerciseId]: nextPerformedExercise,
                    },
                    performedExerciseIds: nextPerformedExerciseIds,
                },
            }
        },
        [],
    )

    const startSessionFromTemplate = useCallback(
        async (templateId: string) => {
            setIsStarting(true)
            setError(null)

            try {
                const currentUid = assertUid()
                const session = await createWorkoutSessionFromTemplate(
                    currentUid,
                    templateId,
                )
                setActiveSession(session)
                showFitnessSuccessToast('Séance lancée.')
            } catch (startError) {
                showFitnessErrorToast(getErrorMessage(startError))
                throw startError
            } finally {
                setIsStarting(false)
            }
        },
        [assertUid],
    )

    const addExerciseToSession = useCallback(
        async (exercise: Exercise) => {
            if (!activeSession) {
                throw new Error('Aucune séance en cours.')
            }
            if (activeSession.sessionType !== 'strength') {
                throw new Error('Ajout d’exercice disponible uniquement pour une séance force.')
            }

            setIsAddingExercise(true)
            setError(null)

            try {
                const currentUid = assertUid()
                const insertedExercise: PlannedWorkoutExercise =
                    await addExerciseToWorkoutSession(currentUid, activeSession.id, {
                        exerciseSource: exercise.exerciseSource,
                        exerciseId: exercise.id,
                        exerciseSnapshot: {
                            name: exercise.name,
                            muscleGroup: exercise.muscleGroup,
                            equipment: exercise.equipment,
                        },
                    })

                setActiveSession((previous) => {
                    if (!previous) {
                        return previous
                    }

                    return {
                        ...previous,
                        plannedExercises: [
                            ...previous.plannedExercises,
                            insertedExercise,
                        ],
                        strengthData: {
                            plannedExercises: [
                                ...previous.plannedExercises,
                                insertedExercise,
                            ],
                            performedExercises: previous.performedExercises,
                            performedExerciseIds: previous.performedExerciseIds,
                        },
                    }
                })
                showFitnessSuccessToast(`Exercice "${exercise.name}" ajouté à la séance.`)
            } catch (addError) {
                showFitnessErrorToast(getErrorMessage(addError))
                throw addError
            } finally {
                setIsAddingExercise(false)
            }
        },
        [activeSession, assertUid],
    )

    const savePerformedExercise = useCallback(
        async (input: SavePerformedExerciseInput) => {
            if (!activeSession) {
                throw new Error('Aucune séance en cours.')
            }
            if (activeSession.sessionType !== 'strength') {
                throw new Error('Le suivi sets/reps est réservé aux séances force.')
            }

            setIsSavingExercise(true)
            setError(null)

            try {
                const currentUid = assertUid()
                await updatePerformedExercise(currentUid, activeSession.id, input)
                setActiveSession((previous) =>
                    patchLocalPerformedExercise(previous, input, 'in_progress'),
                )
            } catch (saveError) {
                showFitnessErrorToast(getErrorMessage(saveError))
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
            if (activeSession.sessionType !== 'strength') {
                throw new Error('Le suivi sets/reps est réservé aux séances force.')
            }

            setIsSavingExercise(true)
            setError(null)

            try {
                const currentUid = assertUid()
                await markExerciseCompleted(currentUid, activeSession.id, input)
                setActiveSession((previous) =>
                    patchLocalPerformedExercise(previous, input, 'completed'),
                )
            } catch (completeError) {
                showFitnessErrorToast(getErrorMessage(completeError))
                throw completeError
            } finally {
                setIsSavingExercise(false)
            }
        },
        [activeSession, assertUid, patchLocalPerformedExercise],
    )

    const saveHiitProgress = useCallback(
        async (input: UpdateHiitSessionInput, options?: { silent?: boolean }) => {
            if (!activeSession) {
                throw new Error('Aucune séance en cours.')
            }
            if (activeSession.sessionType !== 'hiit') {
                throw new Error('Cette séance n’est pas de type HIIT.')
            }

            setIsSavingExercise(true)
            setError(null)

            try {
                const currentUid = assertUid()
                await updateHiitSessionData(currentUid, activeSession.id, input)
                setActiveSession((previous) => {
                    if (!previous || previous.sessionType !== 'hiit') {
                        return previous
                    }

                    return {
                        ...previous,
                        hiitData: {
                            ...previous.hiitData,
                            ...(typeof input.completedRounds === 'number'
                                ? { completedRounds: input.completedRounds }
                                : {}),
                            ...(Array.isArray(input.completedExerciseNames)
                                ? {
                                      completedExerciseNames:
                                          input.completedExerciseNames,
                                  }
                                : {}),
                            ...(typeof input.notes === 'string'
                                ? { notes: input.notes }
                                : {}),
                        },
                    }
                })
                if (!options?.silent) {
                    showFitnessSuccessToast('Progression HIIT sauvegardée.')
                }
            } catch (saveError) {
                if (!options?.silent) {
                    showFitnessErrorToast(getErrorMessage(saveError))
                }
                throw saveError
            } finally {
                setIsSavingExercise(false)
            }
        },
        [activeSession, assertUid],
    )

    const saveRunningProgress = useCallback(
        async (input: UpdateRunningSessionInput) => {
            if (!activeSession) {
                throw new Error('Aucune séance en cours.')
            }
            if (activeSession.sessionType !== 'running') {
                throw new Error('Cette séance n’est pas de type running.')
            }

            setIsSavingExercise(true)
            setError(null)

            try {
                const currentUid = assertUid()
                await updateRunningSessionData(currentUid, activeSession.id, input)
                setActiveSession((previous) => {
                    if (!previous || previous.sessionType !== 'running') {
                        return previous
                    }

                    return {
                        ...previous,
                        runningData: {
                            ...previous.runningData,
                            ...(typeof input.distanceKm === 'number'
                                ? { distanceKm: input.distanceKm }
                                : {}),
                            ...(typeof input.durationSec === 'number'
                                ? { durationSec: input.durationSec }
                                : {}),
                            ...(typeof input.avgPaceSecPerKm === 'number'
                                ? { avgPaceSecPerKm: input.avgPaceSecPerKm }
                                : {}),
                            ...(input.gpxData && typeof input.gpxData === 'object'
                                ? { gpxData: input.gpxData }
                                : {}),
                            ...(typeof input.notes === 'string'
                                ? { notes: input.notes }
                                : {}),
                        },
                    }
                })
                showFitnessSuccessToast('Progression course sauvegardée.')
            } catch (saveError) {
                showFitnessErrorToast(getErrorMessage(saveError))
                throw saveError
            } finally {
                setIsSavingExercise(false)
            }
        },
        [activeSession, assertUid],
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
            try {
                const historyList = await listWorkoutSessionsHistory(currentUid)
                setRecentSessions(
                    historyList
                        .filter((session) => session.status === 'completed')
                        .slice(0, 5),
                )
            } catch {
                // Keep page responsive even if refresh history fails.
            }
            showFitnessSuccessToast('Séance terminée. Elle est maintenant dans l’historique.')
        } catch (finishError) {
            showFitnessErrorToast(getErrorMessage(finishError))
            throw finishError
        } finally {
            setIsFinishingSession(false)
        }
    }, [activeSession, assertUid])

    const uploadRunningGpx = useCallback(
        async (file: File) => {
            if (!activeSession) {
                throw new Error('Aucune séance en cours.')
            }
            if (activeSession.sessionType !== 'running') {
                throw new Error('Cette séance n’est pas de type running.')
            }

            setIsUploadingGpx(true)
            setError(null)

            try {
                const parsedGpx = await parseGpxFile(file)
                const currentUid = assertUid()
                const nextInput: UpdateRunningSessionInput = {
                    gpxData: parsedGpx,
                    ...(parsedGpx.summary.distanceKm > 0
                        ? { distanceKm: parsedGpx.summary.distanceKm }
                        : {}),
                    ...(parsedGpx.summary.durationSec > 0
                        ? { durationSec: parsedGpx.summary.durationSec }
                        : {}),
                    ...(parsedGpx.summary.avgPaceSecPerKm &&
                    Number.isFinite(parsedGpx.summary.avgPaceSecPerKm)
                        ? { avgPaceSecPerKm: parsedGpx.summary.avgPaceSecPerKm }
                        : {}),
                }

                await updateRunningSessionData(currentUid, activeSession.id, nextInput)
                setActiveSession((previous) => {
                    if (!previous || previous.sessionType !== 'running') {
                        return previous
                    }

                    return {
                        ...previous,
                        runningData: {
                            ...previous.runningData,
                            ...(typeof nextInput.distanceKm === 'number'
                                ? { distanceKm: nextInput.distanceKm }
                                : {}),
                            ...(typeof nextInput.durationSec === 'number'
                                ? { durationSec: nextInput.durationSec }
                                : {}),
                            ...(typeof nextInput.avgPaceSecPerKm === 'number'
                                ? { avgPaceSecPerKm: nextInput.avgPaceSecPerKm }
                                : {}),
                            gpxData: parsedGpx,
                        },
                    }
                })
                showFitnessSuccessToast(
                    `GPX importé (${parsedGpx.summary.storedPointCount} points affichables).`,
                )
            } catch (uploadError) {
                showFitnessErrorToast(getErrorMessage(uploadError))
                throw uploadError
            } finally {
                setIsUploadingGpx(false)
            }
        },
        [activeSession, assertUid],
    )

    const completedExerciseCount = useMemo(() => {
        if (!activeSession) {
            return 0
        }
        if (activeSession.sessionType !== 'strength') {
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
        exerciseOptions,
        templates,
        recentSessions,
        activeSession,
        completedExerciseCount,
        isLoading,
        isStarting,
        isAddingExercise,
        isSavingExercise,
        isUploadingGpx,
        isFinishingSession,
        error,
        loadData,
        startSessionFromTemplate,
        addExerciseToSession,
        savePerformedExercise,
        completeExercise,
        saveHiitProgress,
        saveRunningProgress,
        uploadRunningGpx,
        finishSession,
    }
}

export default useWorkoutTodaySession
