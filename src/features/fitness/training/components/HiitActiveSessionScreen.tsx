import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui'
import useWakeLock from '@/features/fitness/common/hooks/useWakeLock'
import type {
    HiitSessionData,
    UpdateHiitSessionInput,
} from '@/features/fitness/training/types/workoutSession'
import {
    HiOutlineCheckCircle,
    HiOutlineChevronRight,
    HiOutlinePause,
    HiOutlinePlay,
    HiOutlineX,
} from 'react-icons/hi'

type HiitPhaseType = 'preparation' | 'work' | 'rest'

type SessionPhaseType = HiitPhaseType | 'finished'

interface HiitPhase {
    id: string
    type: HiitPhaseType
    durationSec: number
    round: number
    exerciseIndex: number
    exerciseName: string
}

interface HiitEngineState {
    phaseIndex: number
    phaseEndsAtMs: number | null
    pausedRemainingMs: number
    isPaused: boolean
    completedWorkCount: number
    isFinished: boolean
}

interface HiitActiveSessionScreenProps {
    hiitData: HiitSessionData
    isFinishingSession: boolean
    onProgressUpdate: (input: UpdateHiitSessionInput) => Promise<void>
    onFinalizeSession: () => Promise<void>
    onExit: () => void
}

const PREPARATION_SECONDS = 10
const TICK_INTERVAL_MS = 200
const ANTICIPATION_SECONDS = 8

const ROUND_MID_MESSAGES = [
    'Excellent rythme, continue comme ça.',
    'Super constance, tu gères.',
    'Très bon tempo, ne lâche rien.',
    'Top, tu es bien lancé.',
]

const ROUND_COMPLETE_MESSAGES = [
    'Tour validé. Très propre.',
    'Bravo, un tour de plus.',
    'Parfait, tour terminé.',
    'Bien joué, continue cette énergie.',
]

const phaseLabel: Record<SessionPhaseType, string> = {
    preparation: 'Préparation',
    work: 'Effort',
    rest: 'Repos',
    finished: 'Terminé',
}

const phaseColorClass: Record<SessionPhaseType, string> = {
    preparation: 'text-blue-400',
    work: 'text-emerald-400',
    rest: 'text-amber-400',
    finished: 'text-emerald-400',
}

const phaseStrokeColor: Record<SessionPhaseType, string> = {
    preparation: '#60A5FA',
    work: '#22C55E',
    rest: '#F59E0B',
    finished: '#22C55E',
}

const clampPositiveInt = (value: number | undefined, fallback: number): number => {
    if (!value || !Number.isFinite(value) || value <= 0) {
        return fallback
    }

    return Math.round(value)
}

const formatDuration = (totalSeconds: number): string => {
    const clamped = Math.max(0, Math.round(totalSeconds))
    const minutes = Math.floor(clamped / 60)
    const seconds = clamped % 60

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const pickRandom = <T,>(values: T[]): T => {
    return values[Math.floor(Math.random() * values.length)]
}

const buildHiitPhases = (hiitData: HiitSessionData) => {
    const exercises = hiitData.exercises
        .map((exercise) => exercise.trim())
        .filter(Boolean)

    const safeExercises = exercises.length > 0 ? exercises : ['Intervalle']
    const rounds = clampPositiveInt(hiitData.rounds, 1)
    const workSec = clampPositiveInt(hiitData.workSec, 40)
    const restSec = clampPositiveInt(hiitData.restSec, 20)
    const restBetweenRoundsSec = clampPositiveInt(
        hiitData.restBetweenRoundsSec,
        restSec,
    )

    const phases: HiitPhase[] = [
        {
            id: 'prep',
            type: 'preparation',
            durationSec: PREPARATION_SECONDS,
            round: 1,
            exerciseIndex: 1,
            exerciseName: safeExercises[0],
        },
    ]

    for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
        for (let exerciseIndex = 0; exerciseIndex < safeExercises.length; exerciseIndex += 1) {
            phases.push({
                id: `work_${roundIndex + 1}_${exerciseIndex + 1}`,
                type: 'work',
                durationSec: workSec,
                round: roundIndex + 1,
                exerciseIndex: exerciseIndex + 1,
                exerciseName: safeExercises[exerciseIndex],
            })

            const isLastExerciseInRound = exerciseIndex === safeExercises.length - 1
            const isLastRound = roundIndex === rounds - 1

            if (isLastExerciseInRound && isLastRound) {
                continue
            }

            phases.push({
                id: `rest_${roundIndex + 1}_${exerciseIndex + 1}`,
                type: 'rest',
                durationSec: isLastExerciseInRound ? restBetweenRoundsSec : restSec,
                round: isLastExerciseInRound ? roundIndex + 2 : roundIndex + 1,
                exerciseIndex: isLastExerciseInRound ? 1 : exerciseIndex + 2,
                exerciseName: isLastExerciseInRound
                    ? safeExercises[0]
                    : safeExercises[exerciseIndex + 1],
            })
        }
    }

    const workPhases = phases.filter((phase) => phase.type === 'work')
    const workPhaseIndexes = phases.reduce<number[]>((acc, phase, index) => {
        if (phase.type === 'work') {
            acc.push(index)
        }
        return acc
    }, [])

    return {
        phases,
        workPhases,
        workPhaseIndexes,
        exerciseCount: safeExercises.length,
        totalRounds: rounds,
    }
}

const buildInitialEngineState = (
    phases: HiitPhase[],
    workPhaseIndexes: number[],
    completedWorkCount: number,
): HiitEngineState => {
    const clampedCompletedWorkCount = Math.min(
        Math.max(0, completedWorkCount),
        workPhaseIndexes.length,
    )

    if (workPhaseIndexes.length === 0 || clampedCompletedWorkCount >= workPhaseIndexes.length) {
        return {
            phaseIndex: phases.length,
            phaseEndsAtMs: null,
            pausedRemainingMs: 0,
            isPaused: false,
            completedWorkCount: clampedCompletedWorkCount,
            isFinished: true,
        }
    }

    const initialPhaseIndex =
        clampedCompletedWorkCount === 0
            ? 0
            : workPhaseIndexes[clampedCompletedWorkCount]

    const initialPhase = phases[initialPhaseIndex]
    const durationMs = initialPhase.durationSec * 1000
    const nowMs = Date.now()

    return {
        phaseIndex: initialPhaseIndex,
        phaseEndsAtMs: nowMs + durationMs,
        pausedRemainingMs: durationMs,
        isPaused: false,
        completedWorkCount: clampedCompletedWorkCount,
        isFinished: false,
    }
}

const moveToNextPhase = (
    state: HiitEngineState,
    phases: HiitPhase[],
    nextPhaseStartMs: number,
): HiitEngineState => {
    const nextPhaseIndex = state.phaseIndex + 1

    if (nextPhaseIndex >= phases.length) {
        return {
            ...state,
            phaseIndex: phases.length,
            phaseEndsAtMs: null,
            pausedRemainingMs: 0,
            isPaused: false,
            isFinished: true,
        }
    }

    const nextDurationMs = phases[nextPhaseIndex].durationSec * 1000

    return {
        ...state,
        phaseIndex: nextPhaseIndex,
        phaseEndsAtMs: nextPhaseStartMs + nextDurationMs,
        pausedRemainingMs: nextDurationMs,
        isPaused: false,
        isFinished: false,
    }
}

const advanceEngineToNow = (
    prev: HiitEngineState,
    phases: HiitPhase[],
    nowMs: number,
): HiitEngineState => {
    if (prev.isFinished || prev.isPaused || prev.phaseEndsAtMs === null) {
        return prev
    }

    if (nowMs < prev.phaseEndsAtMs) {
        return prev
    }

    let next = { ...prev }
    let changed = false

    while (!next.isFinished && !next.isPaused && next.phaseEndsAtMs !== null && nowMs >= next.phaseEndsAtMs) {
        const currentPhase = phases[next.phaseIndex]

        if (currentPhase?.type === 'work') {
            next.completedWorkCount += 1
        }

        next = moveToNextPhase(next, phases, next.phaseEndsAtMs)
        changed = true
    }

    return changed ? next : prev
}

const getAnticipationText = (nextPhase: HiitPhase | null): string => {
    if (!nextPhase) {
        return 'Dernier effort.'
    }

    if (nextPhase.type === 'rest') {
        return 'Prochaine étape: repos.'
    }

    if (nextPhase.type === 'work') {
        return `Prochain exercice: ${nextPhase.exerciseName}.`
    }

    return 'Prépare-toi.'
}

const HiitActiveSessionScreen = ({
    hiitData,
    isFinishingSession,
    onProgressUpdate,
    onFinalizeSession,
    onExit,
}: HiitActiveSessionScreenProps) => {
    const {
        phases,
        workPhases,
        workPhaseIndexes,
        exerciseCount,
        totalRounds,
    } = useMemo(() => buildHiitPhases(hiitData), [hiitData])

    const inferredCompletedWorkCount = useMemo(() => {
        const fromNames = hiitData.completedExerciseNames.length
        const fromRounds = clampPositiveInt(hiitData.completedRounds, 0) * exerciseCount

        return Math.max(fromNames, fromRounds)
    }, [exerciseCount, hiitData.completedExerciseNames.length, hiitData.completedRounds])

    const [engine, setEngine] = useState<HiitEngineState>(() =>
        buildInitialEngineState(phases, workPhaseIndexes, inferredCompletedWorkCount),
    )
    const [nowMs, setNowMs] = useState(Date.now())
    const [isExitPromptOpen, setIsExitPromptOpen] = useState(false)
    const [finalizeError, setFinalizeError] = useState<string | null>(null)

    useWakeLock(!engine.isFinished)

    const audioContextRef = useRef<AudioContext | null>(null)
    const progressSyncQueueRef = useRef<Promise<void>>(Promise.resolve())
    const playedCueKeysRef = useRef<Set<string>>(new Set())
    const shownEncouragementKeysRef = useRef<Set<string>>(new Set())
    const lastPhaseIndexRef = useRef(engine.phaseIndex)
    const lastSyncedCompletedCountRef = useRef(engine.completedWorkCount)

    const currentPhase = !engine.isFinished ? phases[engine.phaseIndex] || null : null
    const nextPhase = !engine.isFinished ? phases[engine.phaseIndex + 1] || null : null

    const phaseType: SessionPhaseType = engine.isFinished
        ? 'finished'
        : currentPhase?.type || 'finished'

    const remainingMs = useMemo(() => {
        if (engine.isFinished) {
            return 0
        }

        if (engine.isPaused) {
            return Math.max(0, engine.pausedRemainingMs)
        }

        if (engine.phaseEndsAtMs === null) {
            return 0
        }

        return Math.max(0, engine.phaseEndsAtMs - nowMs)
    }, [engine.isFinished, engine.isPaused, engine.pausedRemainingMs, engine.phaseEndsAtMs, nowMs])

    const phaseDurationMs = (currentPhase?.durationSec || 1) * 1000

    const totalRemainingSeconds = useMemo(() => {
        if (engine.isFinished) {
            return 0
        }

        const upcomingDuration = phases
            .slice(engine.phaseIndex + 1)
            .reduce((sum, phase) => sum + phase.durationSec, 0)

        return Math.ceil(remainingMs / 1000) + upcomingDuration
    }, [engine.isFinished, engine.phaseIndex, phases, remainingMs])

    const progressRatio = engine.isFinished
        ? 0
        : Math.max(0, Math.min(1, remainingMs / phaseDurationMs))

    const displayRound = currentPhase?.round || totalRounds
    const displayExerciseIndex = currentPhase?.exerciseIndex || exerciseCount

    const currentWorkCount = engine.completedWorkCount
    const completedRounds = Math.floor(currentWorkCount / exerciseCount)

    const playTone = useCallback((frequency: number, durationMs: number, gainValue: number) => {
        if (typeof window === 'undefined') {
            return
        }

        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

        if (!AudioContextClass) {
            return
        }

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContextClass()
            }

            const context = audioContextRef.current
            if (context.state === 'suspended') {
                void context.resume().catch(() => {
                    // no-op
                })
            }
            const oscillator = context.createOscillator()
            const gainNode = context.createGain()

            oscillator.type = 'sine'
            oscillator.frequency.value = frequency
            gainNode.gain.value = gainValue

            oscillator.connect(gainNode)
            gainNode.connect(context.destination)
            oscillator.start()
            oscillator.stop(context.currentTime + durationMs / 1000)
        } catch {
            // Ignore audio playback limitations.
        }
    }, [])

    const playTransitionBell = useCallback(() => {
        playTone(900, 120, 0.05)
        window.setTimeout(() => {
            playTone(1250, 120, 0.04)
        }, 130)
    }, [playTone])

    const playCountdownTick = useCallback(() => {
        playTone(980, 80, 0.035)
    }, [playTone])

    const speak = useCallback((text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
            return
        }

        try {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 1
            utterance.pitch = 1
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
        } catch {
            // Ignore speech synthesis limitations.
        }
    }, [])

    useEffect(() => {
        if (engine.isFinished || engine.isPaused) {
            return
        }

        const intervalId = window.setInterval(() => {
            setNowMs(Date.now())
        }, TICK_INTERVAL_MS)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [engine.isFinished, engine.isPaused])

    useEffect(() => {
        setEngine((prev) => advanceEngineToNow(prev, phases, nowMs))
    }, [nowMs, phases])

    useEffect(() => {
        if (engine.phaseIndex === lastPhaseIndexRef.current) {
            return
        }

        lastPhaseIndexRef.current = engine.phaseIndex
        playedCueKeysRef.current.clear()

        if (engine.isFinished) {
            playTransitionBell()
            speak('Séance HIIT terminée.')
            return
        }

        playTransitionBell()

        const phase = phases[engine.phaseIndex]
        if (phase?.type === 'work') {
            speak(`Exercice: ${phase.exerciseName}`)
        }

        if (phase?.type === 'preparation') {
            speak('Prépare-toi.')
        }
    }, [engine.isFinished, engine.phaseIndex, phases, playTransitionBell, speak])

    useEffect(() => {
        if (engine.isFinished || engine.isPaused || !currentPhase) {
            return
        }

        const remainingSeconds = Math.ceil(remainingMs / 1000)

        if (remainingSeconds <= 0) {
            return
        }

        if (remainingSeconds <= 3) {
            const tickKey = `${engine.phaseIndex}:tick:${remainingSeconds}`
            if (!playedCueKeysRef.current.has(tickKey)) {
                playedCueKeysRef.current.add(tickKey)
                playCountdownTick()
            }
        }

        const anticipationTriggerSecond = Math.min(
            ANTICIPATION_SECONDS,
            Math.max(2, currentPhase.durationSec - 1),
        )

        if (remainingSeconds === anticipationTriggerSecond) {
            const anticipationKey = `${engine.phaseIndex}:anticipation`
            if (!playedCueKeysRef.current.has(anticipationKey)) {
                playedCueKeysRef.current.add(anticipationKey)
                speak(getAnticipationText(nextPhase))
            }
        }
    }, [
        currentPhase,
        engine.isFinished,
        engine.isPaused,
        engine.phaseIndex,
        nextPhase,
        playCountdownTick,
        remainingMs,
        speak,
    ])

    useEffect(() => {
        if (lastSyncedCompletedCountRef.current === engine.completedWorkCount) {
            return
        }

        lastSyncedCompletedCountRef.current = engine.completedWorkCount

        const nextCompletedExerciseNames = workPhases
            .slice(0, engine.completedWorkCount)
            .map((phase) => phase.exerciseName)

        const nextCompletedRounds = Math.floor(engine.completedWorkCount / exerciseCount)

        progressSyncQueueRef.current = progressSyncQueueRef.current
            .then(() =>
                onProgressUpdate({
                    completedRounds: nextCompletedRounds,
                    completedExerciseNames: nextCompletedExerciseNames,
                }),
            )
            .catch(() => {
                // keep immersive flow resilient; error already handled in hook state
            })
    }, [engine.completedWorkCount, exerciseCount, onProgressUpdate, workPhases])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return
        }

        const { body, documentElement } = document
        const scrollY = window.scrollY

        const previousBodyPosition = body.style.position
        const previousBodyTop = body.style.top
        const previousBodyLeft = body.style.left
        const previousBodyRight = body.style.right
        const previousBodyWidth = body.style.width
        const previousBodyOverflow = body.style.overflow
        const previousBodyOverscrollBehavior = body.style.overscrollBehavior
        const previousHtmlOverflow = documentElement.style.overflow
        const previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior

        body.style.position = 'fixed'
        body.style.top = `-${scrollY}px`
        body.style.left = '0'
        body.style.right = '0'
        body.style.width = '100%'
        body.style.overflow = 'hidden'
        body.style.overscrollBehavior = 'none'
        documentElement.style.overflow = 'hidden'
        documentElement.style.overscrollBehavior = 'none'

        return () => {
            body.style.position = previousBodyPosition
            body.style.top = previousBodyTop
            body.style.left = previousBodyLeft
            body.style.right = previousBodyRight
            body.style.width = previousBodyWidth
            body.style.overflow = previousBodyOverflow
            body.style.overscrollBehavior = previousBodyOverscrollBehavior
            documentElement.style.overflow = previousHtmlOverflow
            documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior
            window.scrollTo(0, scrollY)
        }
    }, [])

    useEffect(() => {
        if (engine.completedWorkCount <= 0 || exerciseCount <= 0) {
            return
        }

        const currentRound = Math.floor((engine.completedWorkCount - 1) / exerciseCount) + 1
        const positionInRound =
            ((engine.completedWorkCount - 1) % exerciseCount) + 1
        const halfPoint = Math.ceil(exerciseCount / 2)

        if (exerciseCount > 1 && positionInRound === halfPoint) {
            const key = `round_mid_${currentRound}`
            if (!shownEncouragementKeysRef.current.has(key)) {
                shownEncouragementKeysRef.current.add(key)
                speak(pickRandom(ROUND_MID_MESSAGES))
            }
        }

        if (positionInRound === exerciseCount) {
            const key = `round_done_${currentRound}`
            if (!shownEncouragementKeysRef.current.has(key)) {
                shownEncouragementKeysRef.current.add(key)
                speak(
                    `Tour ${currentRound}/${totalRounds} terminé. ${pickRandom(
                        ROUND_COMPLETE_MESSAGES,
                    )}`,
                )
            }
        }
    }, [engine.completedWorkCount, exerciseCount, speak, totalRounds])

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel()
            }

            if (audioContextRef.current) {
                void audioContextRef.current.close().catch(() => {
                    // no-op
                })
                audioContextRef.current = null
            }
        }
    }, [])

    const handlePause = () => {
        if (engine.isFinished || engine.isPaused) {
            return
        }

        const currentRemainingMs = engine.phaseEndsAtMs
            ? Math.max(0, engine.phaseEndsAtMs - Date.now())
            : engine.pausedRemainingMs

        setEngine((prev) => ({
            ...prev,
            isPaused: true,
            phaseEndsAtMs: null,
            pausedRemainingMs: currentRemainingMs,
        }))
    }

    const pauseEngineNow = useCallback(() => {
        setEngine((prev) => {
            if (prev.isFinished || prev.isPaused) {
                return prev
            }

            const currentRemainingMs = prev.phaseEndsAtMs
                ? Math.max(0, prev.phaseEndsAtMs - Date.now())
                : prev.pausedRemainingMs

            return {
                ...prev,
                isPaused: true,
                phaseEndsAtMs: null,
                pausedRemainingMs: currentRemainingMs,
            }
        })
    }, [])

    const handleResume = () => {
        if (engine.isFinished || !engine.isPaused || !currentPhase) {
            return
        }

        const now = Date.now()
        const remaining = Math.max(100, engine.pausedRemainingMs)

        setEngine((prev) => ({
            ...prev,
            isPaused: false,
            phaseEndsAtMs: now + remaining,
        }))
        setNowMs(now)
    }

    const handleSkip = () => {
        setEngine((prev) => {
            if (prev.isFinished) {
                return prev
            }

            const phase = phases[prev.phaseIndex]
            const shouldCountAsCompleted = phase?.type === 'work'
            const nextCompletedWorkCount =
                prev.completedWorkCount + (shouldCountAsCompleted ? 1 : 0)

            const nextPhaseIndex = prev.phaseIndex + 1

            if (nextPhaseIndex >= phases.length) {
                return {
                    ...prev,
                    completedWorkCount: nextCompletedWorkCount,
                    phaseIndex: phases.length,
                    phaseEndsAtMs: null,
                    pausedRemainingMs: 0,
                    isPaused: false,
                    isFinished: true,
                }
            }

            const nextDurationMs = phases[nextPhaseIndex].durationSec * 1000
            const now = Date.now()

            return {
                ...prev,
                completedWorkCount: nextCompletedWorkCount,
                phaseIndex: nextPhaseIndex,
                phaseEndsAtMs: prev.isPaused ? null : now + nextDurationMs,
                pausedRemainingMs: nextDurationMs,
                isPaused: prev.isPaused,
                isFinished: false,
            }
        })
    }

    const handleFinalize = async () => {
        try {
            setFinalizeError(null)
            await onFinalizeSession()
        } catch (error) {
            if (error instanceof Error && error.message) {
                setFinalizeError(error.message)
            } else {
                setFinalizeError('Impossible de finaliser la séance pour le moment.')
            }
        }
    }

    const handleRequestExit = () => {
        pauseEngineNow()
        setIsExitPromptOpen(true)
    }

    const handleStayInSession = () => {
        setIsExitPromptOpen(false)
    }

    const handleConfirmExit = () => {
        setIsExitPromptOpen(false)
        onExit()
    }

    const nextPreviewPrimary = engine.isFinished
        ? 'Séance terminée'
        : nextPhase
          ? nextPhase.type === 'work'
              ? nextPhase.exerciseName
              : nextPhase.type === 'rest'
                ? 'Repos'
                : 'Préparation'
          : 'Dernière transition'

    const nextPreviewSecondary = engine.isFinished
        ? null
        : nextPhase
          ? nextPhase.type === 'work'
              ? 'Prochain exercice'
              : 'Prochaine étape'
          : 'Prochaine étape'

    const countdownLabel = formatDuration(Math.ceil(remainingMs / 1000))

    const circleRadius = 132
    const circleCircumference = 2 * Math.PI * circleRadius
    const dashOffset = circleCircumference * (1 - progressRatio)

    const overlayContent = (
        <>
            <div
                className="fixed inset-0 z-[3000] h-[100svh] min-h-[100svh] w-full overflow-x-hidden overflow-y-hidden overscroll-none isolate text-gray-100 md:h-[100dvh]"
                style={{ backgroundColor: '#0B1120' }}
            >
                <div className="absolute inset-0 bg-[#0B1120]" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120] via-[#0B1120] to-[#060B16]" />
                <div className="relative mx-auto grid h-full w-full max-w-5xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden pl-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-6 md:pb-4 md:pt-4">
                    <div className="flex items-start justify-end pb-1">
                        <Button
                            size="sm"
                            variant="default"
                            className="shrink-0 border border-white/40 bg-white/20 font-semibold text-white hover:bg-white/30"
                            icon={<HiOutlineX />}
                            onClick={handleRequestExit}
                        >
                            Quitter
                        </Button>
                    </div>

                    {!engine.isFinished ? (
                        <>
                            <div className="flex justify-center py-1">
                                <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500/15 to-blue-500/10 px-3 py-2 shadow-lg shadow-emerald-950/20 sm:px-4 sm:py-3">
                                    <div className="text-center leading-tight">
                                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200/90 sm:text-sm">
                                            Temps restant séance
                                        </p>
                                        <p className="mt-0.5 text-xl font-extrabold tracking-wide text-emerald-100 sm:text-2xl">
                                            {formatDuration(totalRemainingSeconds)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-gray-100 sm:px-4 sm:py-2 sm:text-base">
                                            Round {displayRound}/{totalRounds}
                                        </span>
                                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-gray-100 sm:px-4 sm:py-2 sm:text-base">
                                            Exercice {displayExerciseIndex}/{exerciseCount}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex min-h-0 items-center justify-center py-1">
                                <div className="relative h-[clamp(190px,52vw,300px)] w-[clamp(190px,52vw,300px)] md:h-[clamp(250px,34vh,360px)] md:w-[clamp(250px,34vh,360px)]">
                                    <svg viewBox="0 0 320 320" className="h-full w-full -rotate-90">
                                        <circle
                                            cx="160"
                                            cy="160"
                                            r={circleRadius}
                                            stroke="rgba(148, 163, 184, 0.22)"
                                            strokeWidth="16"
                                            fill="none"
                                        />
                                        <circle
                                            cx="160"
                                            cy="160"
                                            r={circleRadius}
                                            stroke={phaseStrokeColor[phaseType]}
                                            strokeWidth="16"
                                            strokeLinecap="round"
                                            fill="none"
                                            strokeDasharray={circleCircumference}
                                            strokeDashoffset={dashOffset}
                                        />
                                    </svg>
                                    <div className="absolute inset-[15%] flex flex-col items-center justify-center rounded-full bg-[#0F172A] ring-1 ring-white/10">
                                        <p
                                            className={`text-xs font-semibold uppercase tracking-[0.16em] sm:text-sm ${phaseColorClass[phaseType]}`}
                                        >
                                            {phaseLabel[phaseType]}
                                        </p>
                                        <p className="mt-2 text-5xl font-black tracking-tight sm:text-7xl md:text-8xl">
                                            {countdownLabel}
                                        </p>
                                        <p className="mt-1.5 text-xs uppercase tracking-wider text-gray-400 sm:text-sm">
                                            {engine.isPaused ? 'En pause' : 'Temps restant'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center pb-[calc(max(0.625rem,env(safe-area-inset-bottom))+5.75rem)] pt-1 text-center sm:pb-[calc(max(0.625rem,env(safe-area-inset-bottom))+6rem)] sm:pt-2">
                                <div className="mx-auto inline-flex w-full max-w-md flex-col items-center rounded-2xl border border-white/20 bg-white/[0.06] px-4 py-2.5 shadow-lg shadow-slate-950/20 sm:px-5 sm:py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                        Prochaine étape
                                    </p>
                                    <p
                                        className="mt-1 w-full max-w-full truncate text-center text-[clamp(1.35rem,5.8vw,2.1rem)] font-extrabold leading-tight text-gray-100 md:text-4xl"
                                        title={nextPreviewPrimary}
                                    >
                                        {nextPreviewPrimary}
                                    </p>
                                    {nextPreviewSecondary && (
                                        <p className="mt-1 text-center text-xs font-medium uppercase tracking-[0.12em] text-gray-400 sm:text-sm">
                                            {nextPreviewSecondary}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div
                                className={`absolute inset-x-0 bottom-[max(0.625rem,env(safe-area-inset-bottom))] z-10 px-4 md:px-6 ${
                                    isExitPromptOpen ? 'pointer-events-none opacity-0' : ''
                                }`}
                            >
                                <div className="mx-auto grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-center">
                                    <div />
                                    {engine.isPaused ? (
                                        <Button
                                            size="lg"
                                            variant="default"
                                            shape="circle"
                                            className="h-20 w-20 border-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-blue-500 text-white shadow-[0_18px_45px_-18px_rgba(16,185,129,0.95)] hover:from-emerald-300 hover:to-blue-400 active:from-emerald-500 active:to-blue-600 [&_svg]:h-10 [&_svg]:w-10"
                                            icon={<HiOutlinePlay />}
                                            onClick={handleResume}
                                        />
                                    ) : (
                                        <Button
                                            size="lg"
                                            variant="default"
                                            shape="circle"
                                            className="h-20 w-20 border-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-blue-500 text-white shadow-[0_18px_45px_-18px_rgba(16,185,129,0.95)] hover:from-emerald-300 hover:to-blue-400 active:from-emerald-500 active:to-blue-600 [&_svg]:h-10 [&_svg]:w-10"
                                            icon={<HiOutlinePause />}
                                            onClick={handlePause}
                                        />
                                    )}
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        shape="circle"
                                        className="justify-self-center text-gray-300 hover:bg-white/10 hover:text-white [&_svg]:h-6 [&_svg]:w-6"
                                        icon={<HiOutlineChevronRight />}
                                        disabled={isExitPromptOpen}
                                        onClick={handleSkip}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center text-center">
                            <div className="rounded-full bg-emerald-500/15 p-3 ring-1 ring-emerald-300/30">
                                <HiOutlineCheckCircle className="h-24 w-24 text-emerald-300 md:h-28 md:w-28" />
                            </div>
                            <h2 className="mt-4 text-3xl font-bold">Séance terminée</h2>
                            <p className="mt-2 max-w-md text-sm text-gray-300">
                                Excellent travail. Pense à finaliser la séance pour l’enregistrer dans ton historique.
                            </p>

                            <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl bg-white/5 p-3">
                                    <p className="text-xs text-gray-400">Rounds complétés</p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {completedRounds}/{totalRounds}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white/5 p-3">
                                    <p className="text-xs text-gray-400">Exercices complétés</p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {currentWorkCount}/{workPhases.length}
                                    </p>
                                </div>
                            </div>

                            {finalizeError && (
                                <p className="mt-3 text-sm text-red-300">{finalizeError}</p>
                            )}

                            <div className="mt-5 flex w-full max-w-md gap-2">
                                <Button block variant="twoTone" onClick={onExit}>
                                    Fermer
                                </Button>
                                <Button
                                    block
                                    variant="solid"
                                    loading={isFinishingSession}
                                    onClick={handleFinalize}
                                >
                                    Finaliser la séance
                                </Button>
                            </div>
                        </div>
                    )}

                    {isExitPromptOpen && !engine.isFinished && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 px-4 md:px-6">
                            <div className="pointer-events-auto mx-auto w-full max-w-lg rounded-2xl border border-amber-300/30 bg-[#111827]/95 p-4 shadow-2xl backdrop-blur">
                                <p className="text-sm font-semibold text-amber-200">
                                    Séance mise en pause
                                </p>
                                <p className="mt-1 text-sm text-gray-200">
                                    Quitter maintenant ? Ta progression restera sauvegardée et tu pourras reprendre plus tard.
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <Button block variant="default" onClick={handleStayInSession}>
                                        Continuer la séance
                                    </Button>
                                    <Button block variant="solid" onClick={handleConfirmExit}>
                                        Quitter
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )

    if (typeof document === 'undefined') {
        return null
    }

    return createPortal(overlayContent, document.body)
}

export default HiitActiveSessionScreen
