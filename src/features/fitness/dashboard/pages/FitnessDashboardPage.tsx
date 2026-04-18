import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import { Alert, Button, Tag } from '@/components/ui'
import { Link } from 'react-router-dom'
import { FITNESS_ROUTES } from '@/features/fitness/constants/routes'
import { useAppSelector } from '@/store'
import {
    getCurrentWorkoutSession,
    listWorkoutSessionsHistory,
} from '@/features/fitness/training/services/workoutSessionService'
import { getCurrentUserProfile } from '@/features/fitness/account/services/accountProfileService'
import { logFitnessErrorDev } from '@/features/fitness/common/utils/debugError'
import type { WorkoutSession } from '@/features/fitness/training/types/workoutSession'
import { HiOutlinePlay, HiOutlineRefresh } from 'react-icons/hi'

const sessionTypeLabel: Record<'strength' | 'hiit' | 'running' | 'breathing', string> = {
    strength: 'FORCE',
    hiit: 'HIIT',
    running: 'COURSE',
    breathing: 'RESPIRATION',
}

const getSessionTimestampMs = (session: WorkoutSession): number => {
    return (
        session.endedAt?.toMillis?.() ??
        session.completedAt?.toMillis?.() ??
        session.startedAt?.toMillis?.() ??
        session.updatedAt?.toMillis?.() ??
        session.createdAt?.toMillis?.() ??
        0
    )
}

const getWeeklyGoalNote = (completed: number, goal: number): string => {
    if (completed <= 0) {
        return 'Aucune séance validée pour le moment cette semaine.'
    }

    if (completed < goal) {
        const remaining = goal - completed
        return `Encore ${remaining} séance${remaining > 1 ? 's' : ''} pour atteindre ton objectif.`
    }

    if (completed === goal) {
        return 'Objectif hebdo atteint, bravo.'
    }

    const extra = completed - goal
    return `Objectif dépassé de ${extra} séance${extra > 1 ? 's' : ''}. Excellent rythme.`
}

const quickLinks = [
    {
        title: 'Bibliothèque d’exercices',
        description: 'Préparer et structurer les mouvements utiles.',
        to: FITNESS_ROUTES.trainingLibrary,
    },
    {
        title: 'Séance du jour',
        description: 'Lancer la routine planifiée pour aujourd’hui.',
        to: FITNESS_ROUTES.trainingToday,
    },
    {
        title: 'Poids',
        description: 'Enregistrer rapidement la pesée quotidienne.',
        to: FITNESS_ROUTES.bodyWeight,
    },
    {
        title: 'Progression',
        description: 'Suivre les tendances et prochains jalons.',
        to: FITNESS_ROUTES.progress,
    },
]

const getErrorMessage = (error: unknown): string => {
    logFitnessErrorDev('FitnessDashboardPage', error)

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Impossible de charger la séance en cours.'
}

const FitnessDashboardPage = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)
    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
    const [weeklySessionGoal, setWeeklySessionGoal] = useState(4)
    const [weeklyCompletedSessions, setWeeklyCompletedSessions] = useState(0)
    const [sessionsThisYearCount, setSessionsThisYearCount] = useState(0)
    const [isLoadingSession, setIsLoadingSession] = useState(false)
    const [sessionError, setSessionError] = useState<string | null>(null)

    const loadDashboardData = useCallback(async () => {
        if (!uid) {
            setActiveSession(null)
            setWeeklySessionGoal(4)
            setSessionsThisYearCount(0)
            setSessionError(null)
            return
        }

        setIsLoadingSession(true)
        setSessionError(null)

        try {
            const [session, history, profile] = await Promise.all([
                getCurrentWorkoutSession(uid),
                listWorkoutSessionsHistory(uid),
                getCurrentUserProfile(uid),
            ])

            const now = dayjs()
            const daysSinceMonday = (now.day() + 6) % 7
            const weekStart = now
                .subtract(daysSinceMonday, 'day')
                .startOf('day')
                .valueOf()
            const yearStart = dayjs().startOf('year').valueOf()

            const completedThisWeek = history.filter((workoutSession) => {
                if (workoutSession.status !== 'completed') {
                    return false
                }

                return getSessionTimestampMs(workoutSession) >= weekStart
            }).length

            const completedThisYear = history.filter((workoutSession) => {
                if (workoutSession.status !== 'completed') {
                    return false
                }

                return getSessionTimestampMs(workoutSession) >= yearStart
            }).length

            setActiveSession(session)
            setWeeklyCompletedSessions(completedThisWeek)
            setSessionsThisYearCount(completedThisYear)
            setWeeklySessionGoal(profile?.weeklySessionGoal || 4)
        } catch (error) {
            setActiveSession(null)
            setSessionError(getErrorMessage(error))
        } finally {
            setIsLoadingSession(false)
        }
    }, [uid])

    useEffect(() => {
        loadDashboardData()
    }, [loadDashboardData])

    const activeSessionProgress = useMemo(() => {
        if (!activeSession) {
            return {
                completed: 0,
                total: 0,
                percent: 0,
            }
        }
        if (activeSession.sessionType !== 'strength') {
            const completed =
                activeSession.sessionType === 'hiit'
                    ? activeSession.hiitData?.completedRounds || 0
                    : activeSession.sessionType === 'breathing'
                      ? activeSession.breathingData?.completedCycles || 0
                    : activeSession.runningData?.distanceKm
                      ? 1
                      : 0
            const total =
                activeSession.sessionType === 'hiit'
                    ? activeSession.hiitData?.rounds || 0
                    : activeSession.sessionType === 'breathing'
                      ? Math.max(
                            1,
                            Math.floor(
                                (activeSession.breathingData?.durationSec || 300) /
                                    Math.max(
                                        1,
                                        (activeSession.breathingData?.inhaleSec || 5) +
                                            (activeSession.breathingData?.exhaleSec || 5),
                                    ),
                            ),
                        )
                    : 1

            return {
                completed,
                total,
                percent: total > 0 ? Math.round((completed / total) * 100) : 0,
            }
        }

        const total = activeSession.plannedExercises.length
        const completed = activeSession.plannedExercises.filter((exercise) => {
            return (
                activeSession.performedExercises[exercise.plannedExerciseId]?.status ===
                'completed'
            )
        }).length
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0

        return {
            completed,
            total,
            percent,
        }
    }, [activeSession])

    const keyMetrics = useMemo(
        () => [
            {
                label: 'Objectif hebdo',
                value: `${weeklyCompletedSessions}/${weeklySessionGoal}`,
                note: getWeeklyGoalNote(weeklyCompletedSessions, weeklySessionGoal),
            },
            {
                label: 'Sessions faites cette année',
                value: String(sessionsThisYearCount),
                note: `Depuis le 1er janvier ${dayjs().year()}`,
            },
        ],
        [sessionsThisYearCount, weeklyCompletedSessions, weeklySessionGoal],
    )

    const resumeSessionRoute =
        activeSession?.sessionType === 'breathing'
            ? FITNESS_ROUTES.trainingBreathing
            : FITNESS_ROUTES.trainingToday

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Tableau de bord
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Vue d’ensemble fitness</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Retrouve en un coup d’œil tes entraînements, ton corps et ta
                    progression.
                </p>
            </div>

            {sessionError && (
                <Alert type="danger" showIcon>
                    {sessionError}
                </Alert>
            )}

            {activeSession && (
                <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-500/40 dark:bg-[#1F2937]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                                Séance en cours
                            </p>
                            <h5 className="mt-1 text-gray-900 dark:text-[#F9FAFB]">
                                {activeSession.sourceTemplate?.name ||
                                    activeSession.templateName ||
                                    'Séance en cours'}
                            </h5>
                            <p className="mt-1 text-sm text-gray-700 dark:text-[#D1D5DB]">
                                Démarrée le{' '}
                                {activeSession.startedAt
                                    ? dayjs(activeSession.startedAt.toDate()).format(
                                          'DD/MM/YYYY HH:mm',
                                      )
                                    : 'maintenant'}
                                .
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                    {sessionTypeLabel[activeSession.sessionType || 'strength']}
                                </Tag>
                                <Tag className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-100">
                                    {activeSessionProgress.completed}/
                                    {activeSessionProgress.total} terminé
                                    {activeSessionProgress.total > 1 ? 's' : ''}
                                </Tag>
                                <Tag className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100">
                                    {activeSessionProgress.percent}%
                                </Tag>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                icon={<HiOutlineRefresh />}
                                onClick={loadDashboardData}
                            >
                                Rafraîchir
                            </Button>
                            <Link to={resumeSessionRoute}>
                                <Button size="sm" variant="solid" icon={<HiOutlinePlay />}>
                                    Reprendre la séance
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                {keyMetrics.map((metric) => (
                    <Card
                        key={metric.label}
                        className="dark:bg-[#243041] dark:border-[#4B5563]"
                    >
                        <p className="text-sm text-gray-500 dark:text-[#C7D2E5]">
                            {metric.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-[#F9FAFB]">
                            {metric.value}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-[#D1D5DB]">
                            {metric.note}
                        </p>
                    </Card>
                ))}
            </div>

            <Card header="Raccourcis">
                <div className="grid gap-3 md:grid-cols-2">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.title}
                            to={link.to}
                            className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-[#4B5563] dark:bg-[#243041] dark:hover:border-blue-400/60 dark:hover:bg-[#374151]"
                        >
                            <p className="font-semibold text-gray-900 dark:text-[#F9FAFB]">
                                {link.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-[#D1D5DB]">
                                {link.description}
                            </p>
                            <p className="mt-3 text-xs font-semibold text-blue-600 transition group-hover:translate-x-0.5 dark:text-blue-300">
                                Ouvrir
                            </p>
                        </Link>
                    ))}
                </div>
            </Card>
        </div>
    )
}

export default FitnessDashboardPage
