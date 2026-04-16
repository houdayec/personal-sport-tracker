import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store'
import {
    getWorkoutSessionById,
    listWorkoutSessionsHistory,
} from '@/features/fitness/training/services/workoutSessionService'
import type { WorkoutSession } from '@/features/fitness/training/types/workoutSession'

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const getSessionDurationMs = (session: WorkoutSession): number | null => {
    const startedAtMs = session.startedAt?.toMillis?.()

    if (!startedAtMs) {
        return null
    }

    const endMs =
        session.endedAt?.toMillis?.() ??
        session.completedAt?.toMillis?.() ??
        (session.status === 'completed' ? session.updatedAt?.toMillis?.() : null)

    if (!endMs || endMs <= startedAtMs) {
        return null
    }

    return endMs - startedAtMs
}

export const formatDuration = (durationMs: number | null): string => {
    if (!durationMs || durationMs <= 0) {
        return '—'
    }

    const totalMinutes = Math.round(durationMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours > 0) {
        return `${hours}h ${minutes.toString().padStart(2, '0')}`
    }

    return `${minutes} min`
}

export const useWorkoutHistoryList = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [sessions, setSessions] = useState<WorkoutSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadHistory = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (!uid) {
                throw new Error('Utilisateur non connecté.')
            }

            const history = await listWorkoutSessionsHistory(uid)
            setSessions(history)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setSessions([])
        } finally {
            setIsLoading(false)
        }
    }, [uid])

    useEffect(() => {
        loadHistory()
    }, [loadHistory])

    const sessionSummaries = useMemo(() => {
        return sessions.map((session) => ({
            ...session,
            durationMs: getSessionDurationMs(session),
            plannedExerciseCount: session.plannedExercises.length,
        }))
    }, [sessions])

    return {
        sessions,
        sessionSummaries,
        isLoading,
        error,
        loadHistory,
    }
}

export const useWorkoutHistoryDetail = (sessionId?: string) => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [session, setSession] = useState<WorkoutSession | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadSession = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (!uid) {
                throw new Error('Utilisateur non connecté.')
            }

            if (!sessionId) {
                throw new Error('Identifiant de séance invalide.')
            }

            const detail = await getWorkoutSessionById(uid, sessionId)
            setSession(detail)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setSession(null)
        } finally {
            setIsLoading(false)
        }
    }, [uid, sessionId])

    useEffect(() => {
        loadSession()
    }, [loadSession])

    const durationMs = useMemo(() => {
        if (!session) {
            return null
        }

        return getSessionDurationMs(session)
    }, [session])

    return {
        session,
        durationMs,
        isLoading,
        error,
        loadSession,
    }
}
