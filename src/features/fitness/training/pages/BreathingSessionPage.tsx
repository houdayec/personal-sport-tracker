import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Alert, Button, Card, Spinner, Tag } from '@/components/ui'
import { getCurrentUserProfile } from '@/features/fitness/account/services/accountProfileService'
import BreathingActiveSessionScreen from '@/features/fitness/training/components/BreathingActiveSessionScreen'
import useBreathingSession from '@/features/fitness/training/hooks/useBreathingSession'
import type { UpdateBreathingSessionInput } from '@/features/fitness/training/types/workoutSession'
import { useAppSelector } from '@/store'
import {
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlinePlay,
    HiOutlineRefresh,
} from 'react-icons/hi'

const DURATION_OPTIONS = [3, 5, 10]

const formatDuration = (seconds: number): string => {
    const safe = Math.max(0, Math.round(seconds))
    const min = Math.floor(safe / 60)
    const sec = safe % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const BreathingSessionPage = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)
    const {
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
    } = useBreathingSession()

    const [selectedDurationMin, setSelectedDurationMin] = useState(5)
    const [isActiveScreenOpen, setIsActiveScreenOpen] = useState(false)
    const [defaultGuidanceSettings, setDefaultGuidanceSettings] = useState({
        soundEnabled: true,
        voiceEnabled: false,
        vibrationEnabled: false,
    })

    useEffect(() => {
        if (activeSession?.sessionType === 'breathing') {
            setIsActiveScreenOpen(true)
        } else {
            setIsActiveScreenOpen(false)
        }
    }, [activeSession])

    useEffect(() => {
        let isMounted = true

        const loadDefaultGuidanceSettings = async () => {
            if (!uid) {
                return
            }

            try {
                const profile = await getCurrentUserProfile(uid)
                if (!isMounted || !profile) {
                    return
                }

                setDefaultGuidanceSettings({
                    soundEnabled: profile.breathingGuidanceDefaults?.soundEnabled ?? true,
                    voiceEnabled: profile.breathingGuidanceDefaults?.voiceEnabled ?? false,
                    vibrationEnabled:
                        profile.breathingGuidanceDefaults?.vibrationEnabled ?? false,
                })
            } catch {
                // fallback to current defaults
            }
        }

        void loadDefaultGuidanceSettings()

        return () => {
            isMounted = false
        }
    }, [uid])

    const breathingData = useMemo(() => {
        if (!activeSession || activeSession.sessionType !== 'breathing') {
            return null
        }
        return activeSession.breathingData
    }, [activeSession])

    const progress = useMemo(() => {
        if (!breathingData) {
            return { elapsedSec: 0, durationSec: selectedDurationMin * 60, percent: 0 }
        }

        const durationSec = Math.max(1, breathingData.durationSec || selectedDurationMin * 60)
        const elapsedSec = Math.max(0, Math.min(durationSec, breathingData.elapsedSec || 0))
        const percent = Math.round((elapsedSec / durationSec) * 100)

        return {
            elapsedSec,
            durationSec,
            percent,
        }
    }, [breathingData, selectedDurationMin])

    const handleStartSession = async () => {
        try {
            await startSession({
                inhaleSec: 5,
                exhaleSec: 5,
                durationSec: selectedDurationMin * 60,
            })
        } catch {
            // handled in hook state/toast
        }
    }

    const handleProgressUpdate = async (
        input: UpdateBreathingSessionInput,
        options?: { silent?: boolean },
    ) => {
        try {
            await saveProgress(input, options)
        } catch {
            // handled in hook state/toast
        }
    }

    const handleFinalizeSession = async () => {
        try {
            await finishSession()
            setIsActiveScreenOpen(false)
        } catch {
            // handled in hook state/toast
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Respiration
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Cohérence cardiaque</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                        Une séance guidée de respiration pour retrouver calme, focus et stabilité.
                    </p>
                </div>
                <Button
                    size="sm"
                    icon={<HiOutlineRefresh />}
                    onClick={loadData}
                    disabled={isLoading || isStarting || isSaving || isFinishing}
                >
                    Rafraîchir
                </Button>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            {isLoading ? (
                <Card>
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                </Card>
            ) : !activeSession ? (
                <Card>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
                                Session respiration
                            </p>
                            <h5 className="mt-1">Prêt à démarrer</h5>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                Pattern standard 5s inspiration / 5s expiration.
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                Durée
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {DURATION_OPTIONS.map((minutes) => (
                                    <Button
                                        key={minutes}
                                        size="sm"
                                        variant={
                                            selectedDurationMin === minutes
                                                ? 'solid'
                                                : 'default'
                                        }
                                        onClick={() => setSelectedDurationMin(minutes)}
                                    >
                                        {minutes} min
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-1">
                            <Button
                                size="sm"
                                variant="solid"
                                icon={<HiOutlinePlay />}
                                loading={isStarting}
                                onClick={handleStartSession}
                            >
                                Lancer la séance
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h5>Séance respiration en cours</h5>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Démarrée le{' '}
                                {activeSession.startedAt
                                    ? dayjs(activeSession.startedAt.toDate()).format(
                                          'DD/MM/YYYY HH:mm',
                                      )
                                    : 'maintenant'}
                                .
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Tag className="bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-100">
                                    {progress.percent}%
                                </Tag>
                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                    <span className="inline-flex items-center gap-1">
                                        <HiOutlineClock />
                                        {formatDuration(progress.elapsedSec)} /{' '}
                                        {formatDuration(progress.durationSec)}
                                    </span>
                                </Tag>
                                <Tag className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
                                    Cycles: {breathingData?.completedCycles || 0}
                                </Tag>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="solid"
                                icon={<HiOutlinePlay />}
                                onClick={() => setIsActiveScreenOpen(true)}
                            >
                                Ouvrir mode immersif
                            </Button>
                            <Button
                                size="sm"
                                variant="twoTone"
                                icon={<HiOutlineCheckCircle />}
                                loading={isFinishing}
                                onClick={handleFinalizeSession}
                            >
                                Terminer la séance
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {isActiveScreenOpen && activeSession?.sessionType === 'breathing' && breathingData && (
                <BreathingActiveSessionScreen
                    breathingData={breathingData}
                    defaultGuidanceSettings={defaultGuidanceSettings}
                    isFinishingSession={isFinishing}
                    onProgressUpdate={handleProgressUpdate}
                    onFinalizeSession={handleFinalizeSession}
                    onExit={() => setIsActiveScreenOpen(false)}
                />
            )}
        </div>
    )
}

export default BreathingSessionPage
