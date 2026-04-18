import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store'
import { logFitnessErrorDev } from '@/features/fitness/common/utils/debugError'
import {
    finishWorkoutSession,
    getCurrentBreathingSession,
    startBreathingSession,
    updateBreathingSessionData,
} from '@/features/fitness/training/services/workoutSessionService'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import type {
    CreateBreathingSessionInput,
    UpdateBreathingSessionInput,
    WorkoutSession,
} from '@/features/fitness/training/types/workoutSession'

const getErrorMessage = (error: unknown): string => {
    logFitnessErrorDev('useBreathingSession', error)

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useBreathingSession = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isStarting, setIsStarting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isFinishing, setIsFinishing] = useState(false)
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
            const currentSession = await getCurrentBreathingSession(currentUid)
            setActiveSession(currentSession)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
        } finally {
            setIsLoading(false)
        }
    }, [assertUid])

    useEffect(() => {
        loadData()
    }, [loadData])

    const startSession = useCallback(
        async (input?: CreateBreathingSessionInput) => {
            setIsStarting(true)
            setError(null)

            try {
                const currentUid = assertUid()
                const session = await startBreathingSession(currentUid, input)
                setActiveSession(session)
                showFitnessSuccessToast('Séance respiration lancée.')
                return session
            } catch (startError) {
                const message = getErrorMessage(startError)
                setError(message)
                showFitnessErrorToast(message)
                throw startError
            } finally {
                setIsStarting(false)
            }
        },
        [assertUid],
    )

    const saveProgress = useCallback(
        async (input: UpdateBreathingSessionInput, options?: { silent?: boolean }) => {
            if (!activeSession) {
                throw new Error('Aucune séance respiration en cours.')
            }
            if (activeSession.sessionType !== 'breathing') {
                throw new Error('La séance active n’est pas de type respiration.')
            }

            setIsSaving(true)
            setError(null)

            try {
                const currentUid = assertUid()
                await updateBreathingSessionData(currentUid, activeSession.id, input)

                setActiveSession((previous) => {
                    if (!previous || previous.sessionType !== 'breathing') {
                        return previous
                    }

                    const inhaleSec = previous.breathingData?.inhaleSec || 5
                    const exhaleSec = previous.breathingData?.exhaleSec || 5
                    const durationSec = previous.breathingData?.durationSec || 300
                    const cycleSec = inhaleSec + exhaleSec
                    const nextElapsed =
                        typeof input.elapsedSec === 'number'
                            ? Math.max(0, Math.min(durationSec, Math.round(input.elapsedSec)))
                            : previous.breathingData?.elapsedSec || 0
                    const nextCycles =
                        typeof input.completedCycles === 'number'
                            ? Math.max(0, Math.round(input.completedCycles))
                            : cycleSec > 0
                              ? Math.floor(nextElapsed / cycleSec)
                              : 0

                    return {
                        ...previous,
                        breathingData: {
                            ...(previous.breathingData || {
                                inhaleSec,
                                exhaleSec,
                                durationSec,
                                elapsedSec: 0,
                                completedCycles: 0,
                            }),
                            elapsedSec: nextElapsed,
                            completedCycles: nextCycles,
                            ...(typeof input.notes === 'string'
                                ? { notes: input.notes }
                                : {}),
                        },
                    }
                })

                if (!options?.silent) {
                    showFitnessSuccessToast('Progression respiration sauvegardée.')
                }
            } catch (saveError) {
                const message = getErrorMessage(saveError)
                setError(message)
                if (!options?.silent) {
                    showFitnessErrorToast(message)
                }
                throw saveError
            } finally {
                setIsSaving(false)
            }
        },
        [activeSession, assertUid],
    )

    const finishSession = useCallback(async () => {
        if (!activeSession) {
            throw new Error('Aucune séance respiration en cours.')
        }

        setIsFinishing(true)
        setError(null)

        try {
            const currentUid = assertUid()
            await finishWorkoutSession(currentUid, activeSession.id)
            setActiveSession(null)
            showFitnessSuccessToast('Séance respiration terminée.')
        } catch (finishError) {
            const message = getErrorMessage(finishError)
            setError(message)
            showFitnessErrorToast(message)
            throw finishError
        } finally {
            setIsFinishing(false)
        }
    }, [activeSession, assertUid])

    return {
        activeSession,
        isLoading,
        isStarting,
        isSaving,
        isFinishing,
        error,
        loadData,
        startSession,
        saveProgress,
        finishSession,
    }
}

export default useBreathingSession
