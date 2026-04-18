import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui'
import useWakeLock from '@/features/fitness/common/hooks/useWakeLock'
import type {
    BreathingSessionData,
    UpdateBreathingSessionInput,
} from '@/features/fitness/training/types/workoutSession'
import {
    HiOutlineDeviceMobile,
    HiOutlinePause,
    HiOutlinePlay,
    HiOutlineRefresh,
    HiOutlineVolumeOff,
    HiOutlineVolumeUp,
    HiOutlineX,
} from 'react-icons/hi'

type BreathingPhase = 'inhale' | 'exhale' | 'finished'

interface BreathingActiveSessionScreenProps {
    breathingData: BreathingSessionData
    defaultGuidanceSettings?: {
        soundEnabled?: boolean
        voiceEnabled?: boolean
        vibrationEnabled?: boolean
    }
    isFinishingSession: boolean
    onProgressUpdate: (
        input: UpdateBreathingSessionInput,
        options?: { silent?: boolean },
    ) => Promise<void>
    onFinalizeSession: () => Promise<void>
    onExit: () => void
}

interface BreathingEngineState {
    isPaused: boolean
    isFinished: boolean
    accumulatedMs: number
    runStartedAtMs: number | null
}

const TICK_INTERVAL_MS = 120
const SYNC_EVERY_SECONDS = 5

const formatDuration = (totalSeconds: number): string => {
    const clamped = Math.max(0, Math.round(totalSeconds))
    const minutes = Math.floor(clamped / 60)
    const seconds = clamped % 60

    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
}

const clampPositiveNumber = (value: number | undefined, fallback: number): number => {
    if (!value || !Number.isFinite(value) || value <= 0) {
        return fallback
    }

    return value
}

const BreathingActiveSessionScreen = ({
    breathingData,
    defaultGuidanceSettings,
    isFinishingSession,
    onProgressUpdate,
    onFinalizeSession,
    onExit,
}: BreathingActiveSessionScreenProps) => {
    const inhaleMs = clampPositiveNumber(breathingData.inhaleSec, 5) * 1000
    const exhaleMs = clampPositiveNumber(breathingData.exhaleSec, 5) * 1000
    const cycleMs = inhaleMs + exhaleMs
    const durationMs = clampPositiveNumber(breathingData.durationSec, 300) * 1000

    const initialAccumulatedMs = Math.max(
        0,
        Math.min(durationMs, Math.round((breathingData.elapsedSec || 0) * 1000)),
    )

    const [engine, setEngine] = useState<BreathingEngineState>({
        isPaused: true,
        isFinished: initialAccumulatedMs >= durationMs,
        accumulatedMs: initialAccumulatedMs,
        runStartedAtMs: null,
    })
    const [nowMs, setNowMs] = useState(Date.now())
    const [isSoundEnabled, setIsSoundEnabled] = useState(
        defaultGuidanceSettings?.soundEnabled ?? true,
    )
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(
        defaultGuidanceSettings?.voiceEnabled ?? false,
    )
    const [isVibrationEnabled, setIsVibrationEnabled] = useState(
        defaultGuidanceSettings?.vibrationEnabled ?? false,
    )
    const [isExitPromptOpen, setIsExitPromptOpen] = useState(false)
    const [finalizeError, setFinalizeError] = useState<string | null>(null)

    const audioContextRef = useRef<AudioContext | null>(null)
    const speechUnlockedRef = useRef(false)
    const lastSyncedSecondRef = useRef<number | null>(null)
    const syncQueueRef = useRef<Promise<void>>(Promise.resolve())
    const lastPhaseRef = useRef<BreathingPhase>('finished')

    useWakeLock(!engine.isPaused && !engine.isFinished)

    const elapsedMs = useMemo(() => {
        if (engine.isFinished) {
            return durationMs
        }

        if (engine.isPaused || !engine.runStartedAtMs) {
            return engine.accumulatedMs
        }

        return Math.max(
            0,
            Math.min(durationMs, engine.accumulatedMs + (nowMs - engine.runStartedAtMs)),
        )
    }, [durationMs, engine.accumulatedMs, engine.isFinished, engine.isPaused, engine.runStartedAtMs, nowMs])

    const remainingMs = Math.max(0, durationMs - elapsedMs)
    const completedCycles = cycleMs > 0 ? Math.floor(elapsedMs / cycleMs) : 0
    const currentCycle = cycleMs > 0 ? completedCycles + 1 : 1

    const phase: BreathingPhase = useMemo(() => {
        if (engine.isFinished || elapsedMs >= durationMs) {
            return 'finished'
        }

        const cycleProgress = elapsedMs % cycleMs
        return cycleProgress < inhaleMs ? 'inhale' : 'exhale'
    }, [cycleMs, durationMs, elapsedMs, engine.isFinished, inhaleMs])

    const phaseElapsedMs = useMemo(() => {
        if (phase === 'finished') {
            return 0
        }

        const cycleProgress = elapsedMs % cycleMs
        return phase === 'inhale' ? cycleProgress : cycleProgress - inhaleMs
    }, [cycleMs, elapsedMs, inhaleMs, phase])

    const phaseDurationMs = phase === 'inhale' ? inhaleMs : phase === 'exhale' ? exhaleMs : 1
    const phaseProgress = Math.max(0, Math.min(1, phaseElapsedMs / phaseDurationMs))
    const phaseRemainingMs = phase === 'finished' ? 0 : Math.max(0, phaseDurationMs - phaseElapsedMs)
    const sphereScale = phase === 'inhale'
        ? 0.78 + 0.3 * phaseProgress
        : phase === 'exhale'
          ? 1.08 - 0.3 * phaseProgress
          : 0.82

    const phaseLabel = phase === 'inhale' ? 'Inspiration' : phase === 'exhale' ? 'Expiration' : 'Terminé'

    const playPhaseBell = useCallback(
        (targetPhase: 'inhale' | 'exhale') => {
            if (!isSoundEnabled || typeof window === 'undefined') {
                return
            }

            const AudioContextClass =
                window.AudioContext ||
                (window as Window & { webkitAudioContext?: typeof AudioContext })
                    .webkitAudioContext

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

                const now = context.currentTime + 0.01
                const notes =
                    targetPhase === 'inhale'
                        ? [700, 980] // montée douce -> inspiration
                        : [620, 440] // descente douce -> expiration

                notes.forEach((frequency, noteIndex) => {
                    const startAt = now + noteIndex * 0.12
                    const stopAt = startAt + 0.24
                    const oscillator = context.createOscillator()
                    const gainNode = context.createGain()

                    oscillator.type = 'sine'
                    oscillator.frequency.setValueAtTime(frequency, startAt)
                    gainNode.gain.setValueAtTime(0.0001, startAt)
                    gainNode.gain.exponentialRampToValueAtTime(0.028, startAt + 0.03)
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt)

                    oscillator.connect(gainNode)
                    gainNode.connect(context.destination)
                    oscillator.start(startAt)
                    oscillator.stop(stopAt)
                })
            } catch {
                // Ignore audio constraints.
            }
        },
        [isSoundEnabled],
    )

    const triggerPhaseVibration = useCallback(
        (targetPhase: 'inhale' | 'exhale') => {
            if (
                !isVibrationEnabled ||
                typeof window === 'undefined' ||
                typeof navigator === 'undefined' ||
                typeof navigator.vibrate !== 'function'
            ) {
                return
            }

            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                return
            }

            try {
                if (targetPhase === 'inhale') {
                    navigator.vibrate(22)
                } else {
                    navigator.vibrate([14, 36, 14])
                }
            } catch {
                // Ignore haptics constraints.
            }
        },
        [isVibrationEnabled],
    )

    const ensureSpeechUnlocked = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return
        }
        if (speechUnlockedRef.current) {
            return
        }

        try {
            const utterance = new SpeechSynthesisUtterance('Prêt')
            utterance.lang = 'fr-FR'
            utterance.volume = 0
            utterance.onstart = () => {
                speechUnlockedRef.current = true
            }
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
            window.setTimeout(() => {
                window.speechSynthesis.cancel()
            }, 120)
        } catch {
            // no-op
        }
    }, [])

    const speak = useCallback(
        (text: string) => {
            if (
                !isVoiceEnabled ||
                typeof window === 'undefined' ||
                !('speechSynthesis' in window) ||
                !text.trim()
            ) {
                return
            }

            try {
                const utterance = new SpeechSynthesisUtterance(text.trim())
                utterance.lang = 'fr-FR'
                utterance.rate = 0.95
                utterance.pitch = 0.95
                utterance.onstart = () => {
                    speechUnlockedRef.current = true
                }
                window.speechSynthesis.cancel()
                window.speechSynthesis.speak(utterance)
            } catch {
                // Ignore speech constraints.
            }
        },
        [isVoiceEnabled],
    )

    const queueProgressSync = useCallback(
        (input: UpdateBreathingSessionInput, options?: { silent?: boolean }) => {
            syncQueueRef.current = syncQueueRef.current
                .then(() => onProgressUpdate(input, options))
                .catch(() => {
                    // Keep experience smooth even if sync fails.
                })
        },
        [onProgressUpdate],
    )

    useEffect(() => {
        setIsSoundEnabled(defaultGuidanceSettings?.soundEnabled ?? true)
        setIsVoiceEnabled(defaultGuidanceSettings?.voiceEnabled ?? false)
        setIsVibrationEnabled(defaultGuidanceSettings?.vibrationEnabled ?? false)
    }, [
        defaultGuidanceSettings?.soundEnabled,
        defaultGuidanceSettings?.voiceEnabled,
        defaultGuidanceSettings?.vibrationEnabled,
    ])

    useEffect(() => {
        if (engine.isPaused || engine.isFinished) {
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
        if (engine.isFinished || elapsedMs < durationMs) {
            return
        }

        setEngine((previous) => ({
            ...previous,
            isFinished: true,
            isPaused: true,
            accumulatedMs: durationMs,
            runStartedAtMs: null,
        }))
        queueProgressSync(
            {
                elapsedSec: Math.floor(durationMs / 1000),
                completedCycles,
            },
            { silent: true },
        )
    }, [completedCycles, durationMs, elapsedMs, engine.isFinished, queueProgressSync])

    useEffect(() => {
        const elapsedSec = Math.floor(elapsedMs / 1000)
        if (lastSyncedSecondRef.current === elapsedSec) {
            return
        }

        if (!engine.isPaused && !engine.isFinished && elapsedSec % SYNC_EVERY_SECONDS !== 0) {
            return
        }

        lastSyncedSecondRef.current = elapsedSec
        queueProgressSync(
            {
                elapsedSec,
                completedCycles,
            },
            { silent: true },
        )
    }, [completedCycles, elapsedMs, engine.isFinished, engine.isPaused, queueProgressSync])

    useEffect(() => {
        if (phase === lastPhaseRef.current) {
            return
        }

        if (!engine.isPaused && !engine.isFinished) {
            if (phase === 'inhale' || phase === 'exhale') {
                playPhaseBell(phase)
                triggerPhaseVibration(phase)
            }
            if (phase === 'inhale') {
                speak('Inspire')
            } else if (phase === 'exhale') {
                speak('Expire')
            }
        }

        lastPhaseRef.current = phase
    }, [engine.isFinished, engine.isPaused, phase, playPhaseBell, speak, triggerPhaseVibration])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const handlePointerDown = () => {
            if (!isVoiceEnabled) {
                return
            }
            ensureSpeechUnlocked()
        }

        window.addEventListener('pointerdown', handlePointerDown)
        window.addEventListener('touchstart', handlePointerDown)

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown)
            window.removeEventListener('touchstart', handlePointerDown)
        }
    }, [ensureSpeechUnlocked, isVoiceEnabled])

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

    const handleTogglePlayPause = () => {
        if (isVoiceEnabled) {
            ensureSpeechUnlocked()
        }

        if (engine.isFinished) {
            return
        }

        if (engine.isPaused) {
            const now = Date.now()
            setEngine((previous) => ({
                ...previous,
                isPaused: false,
                runStartedAtMs: now,
            }))
            setNowMs(now)
            return
        }

        const now = Date.now()
        const nextElapsed = engine.runStartedAtMs
            ? engine.accumulatedMs + (now - engine.runStartedAtMs)
            : engine.accumulatedMs
        const boundedElapsed = Math.max(0, Math.min(durationMs, nextElapsed))

        setEngine((previous) => ({
            ...previous,
            isPaused: true,
            runStartedAtMs: null,
            accumulatedMs: boundedElapsed,
        }))

        queueProgressSync(
            {
                elapsedSec: Math.floor(boundedElapsed / 1000),
                completedCycles,
            },
            { silent: true },
        )
    }

    const handleRestart = () => {
        if (isVoiceEnabled) {
            ensureSpeechUnlocked()
        }
        setFinalizeError(null)
        setEngine({
            isPaused: true,
            isFinished: false,
            accumulatedMs: 0,
            runStartedAtMs: null,
        })
        setNowMs(Date.now())
        queueProgressSync(
            {
                elapsedSec: 0,
                completedCycles: 0,
            },
            { silent: true },
        )
    }

    const handleRequestExit = () => {
        setIsExitPromptOpen(true)
    }

    const handleConfirmExit = async () => {
        queueProgressSync(
            {
                elapsedSec: Math.floor(elapsedMs / 1000),
                completedCycles,
            },
            { silent: true },
        )
        try {
            setFinalizeError(null)
            await onFinalizeSession()
            setIsExitPromptOpen(false)
        } catch (error) {
            if (error instanceof Error && error.message) {
                setFinalizeError(error.message)
            } else {
                setFinalizeError('Impossible de terminer la séance pour le moment.')
            }
        }
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

    const overlayContent = (
        <div
            className="fixed inset-0 z-[3000] h-[100svh] w-full overflow-hidden text-white"
            style={{
                background:
                    'radial-gradient(circle at 50% 30%, #1e3a4a 0%, #0f172a 45%, #0a0f1f 100%)',
            }}
        >
            <div className="relative mx-auto grid h-full w-full max-w-5xl grid-rows-[auto_1fr_auto] px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-[max(0.8rem,env(safe-area-inset-top))] md:px-8">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
                        Cohérence cardiaque
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsVibrationEnabled((previous) => !previous)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/15"
                        >
                            <HiOutlineDeviceMobile />
                            {isVibrationEnabled ? 'Vibreur' : 'Vibreur coupé'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSoundEnabled((previous) => !previous)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/15"
                        >
                            {isSoundEnabled ? <HiOutlineVolumeUp /> : <HiOutlineVolumeOff />}
                            {isSoundEnabled ? 'Son' : 'Son coupé'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const nextValue = !isVoiceEnabled
                                setIsVoiceEnabled(nextValue)
                                if (nextValue) {
                                    ensureSpeechUnlocked()
                                } else if (
                                    typeof window !== 'undefined' &&
                                    'speechSynthesis' in window
                                ) {
                                    window.speechSynthesis.cancel()
                                }
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/15"
                        >
                            {isVoiceEnabled ? <HiOutlineVolumeUp /> : <HiOutlineVolumeOff />}
                            {isVoiceEnabled ? 'Voix' : 'Voix coupée'}
                        </button>
                    </div>
                </div>

                <div className="flex min-h-0 flex-col items-center justify-center text-center">
                    <p className="text-sm uppercase tracking-[0.12em] text-cyan-200/80">
                        Temps restant
                    </p>
                    <p className="mt-1 text-5xl font-black tracking-tight md:text-6xl">
                        {formatDuration(Math.ceil(remainingMs / 1000))}
                    </p>
                    <p className="mt-3 text-base font-semibold text-cyan-100/90 md:text-lg">
                        {phaseLabel}
                    </p>
                    <p className="mt-1 text-sm text-cyan-200/75">
                        Changement dans {formatDuration(Math.ceil(phaseRemainingMs / 1000))}
                    </p>

                    <div className="relative mt-8 flex h-[230px] w-[230px] items-center justify-center md:h-[300px] md:w-[300px]">
                        <div
                            className="absolute inset-0 rounded-full bg-cyan-400/10 blur-2xl"
                            style={{
                                transform: `scale(${Math.max(0.86, sphereScale * 0.95)})`,
                                transition: 'transform 120ms linear',
                            }}
                        />
                        <div
                            className="relative h-[180px] w-[180px] rounded-full bg-gradient-to-br from-cyan-300/80 via-sky-300/65 to-emerald-300/55 ring-1 ring-white/30 md:h-[240px] md:w-[240px]"
                            style={{
                                transform: `scale(${sphereScale})`,
                                transition: 'transform 120ms linear',
                            }}
                        />
                    </div>

                    <p className="mt-8 text-sm text-cyan-100/80">
                        Cycle {currentCycle} · {completedCycles} terminé{completedCycles > 1 ? 's' : ''}
                    </p>
                </div>

                <div className="mx-auto grid w-full max-w-md grid-cols-3 items-center gap-3">
                    <Button
                        size="sm"
                        variant="plain"
                        icon={<HiOutlineRefresh />}
                        className="justify-self-start text-cyan-100 hover:bg-white/10"
                        onClick={handleRestart}
                    >
                        Recommencer
                    </Button>
                    <Button
                        size="lg"
                        variant="default"
                        shape="circle"
                        className="mx-auto h-20 w-20 border-0 bg-gradient-to-br from-cyan-400 via-sky-400 to-emerald-400 text-white shadow-[0_18px_45px_-18px_rgba(45,212,191,0.9)] hover:from-cyan-300 hover:to-emerald-300 [&_svg]:h-10 [&_svg]:w-10"
                        icon={engine.isPaused ? <HiOutlinePlay /> : <HiOutlinePause />}
                        onClick={handleTogglePlayPause}
                    />
                    <Button
                        size="sm"
                        variant="plain"
                        icon={<HiOutlineX />}
                        className="justify-self-end text-cyan-100 hover:bg-white/10"
                        onClick={handleRequestExit}
                    >
                        Quitter
                    </Button>
                </div>
            </div>

            {engine.isFinished && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
                    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-cyan-200/25 bg-slate-950/85 p-5 text-center shadow-2xl backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.12em] text-cyan-200/80">
                            Session complétée
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-cyan-50">Respiration terminée</h3>
                        <p className="mt-2 text-sm text-cyan-100/80">
                            Très bien. Finalise la séance pour l’ajouter à l’historique.
                        </p>
                        {finalizeError && (
                            <p className="mt-2 text-sm text-red-300">{finalizeError}</p>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Button variant="twoTone" onClick={onExit}>
                                Fermer
                            </Button>
                            <Button
                                variant="solid"
                                loading={isFinishingSession}
                                onClick={handleFinalize}
                            >
                                Finaliser
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isExitPromptOpen && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-cyan-200/25 bg-slate-950/90 p-4 shadow-2xl backdrop-blur">
                        <p className="text-sm font-semibold text-cyan-100">Quitter l’écran immersif ?</p>
                        <p className="mt-1 text-xs text-cyan-100/75">
                            La séance va être terminée et enregistrée dans l’historique.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <Button block variant="default" onClick={() => setIsExitPromptOpen(false)}>
                                Continuer
                            </Button>
                            <Button
                                block
                                variant="solid"
                                loading={isFinishingSession}
                                onClick={handleConfirmExit}
                            >
                                Quitter
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    if (typeof document === 'undefined') {
        return null
    }

    return createPortal(overlayContent, document.body)
}

export default BreathingActiveSessionScreen
