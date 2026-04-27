import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
    Alert,
    Button,
    Dialog,
    FormContainer,
    FormItem,
    Input,
} from '@/components/ui'
import type {
    CreatePastWorkoutSessionInput,
    SessionType,
} from '@/features/fitness/training/types/workoutSession'

interface PastWorkoutSessionDialogProps {
    isOpen: boolean
    isSubmitting: boolean
    onClose: () => void
    onSubmit: (input: CreatePastWorkoutSessionInput) => Promise<void>
}

const SESSION_TYPE_OPTIONS: Array<{ value: SessionType; label: string }> = [
    { value: 'strength', label: 'Force' },
    { value: 'hiit', label: 'HIIT' },
    { value: 'running', label: 'Course' },
    { value: 'breathing', label: 'Respiration' },
]

const getDefaultStartedAt = () => dayjs().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm')

const PastWorkoutSessionDialog = ({
    isOpen,
    isSubmitting,
    onClose,
    onSubmit,
}: PastWorkoutSessionDialogProps) => {
    const [sessionType, setSessionType] = useState<SessionType>('strength')
    const [sourceName, setSourceName] = useState('')
    const [startedAt, setStartedAt] = useState(getDefaultStartedAt())
    const [durationMin, setDurationMin] = useState('45')
    const [strengthExerciseCount, setStrengthExerciseCount] = useState('4')
    const [hiitRounds, setHiitRounds] = useState('4')
    const [hiitExerciseCount, setHiitExerciseCount] = useState('4')
    const [runningType, setRunningType] = useState('Footing')
    const [distanceKm, setDistanceKm] = useState('')
    const [breathingCompletedCycles, setBreathingCompletedCycles] = useState('')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        setSessionType('strength')
        setSourceName('')
        setStartedAt(getDefaultStartedAt())
        setDurationMin('45')
        setStrengthExerciseCount('4')
        setHiitRounds('4')
        setHiitExerciseCount('4')
        setRunningType('Footing')
        setDistanceKm('')
        setBreathingCompletedCycles('')
        setNotes('')
        setError(null)
    }, [isOpen])

    const titleLabel = useMemo(() => {
        switch (sessionType) {
            case 'strength':
                return 'Nom du modèle / séance'
            case 'hiit':
                return 'Nom du bloc HIIT'
            case 'running':
                return 'Nom de la sortie'
            case 'breathing':
                return 'Nom de la session respiration'
            default:
                return 'Nom de séance'
        }
    }, [sessionType])

    const handleSubmit = async () => {
        setError(null)

        const parsedDate = new Date(startedAt)
        if (Number.isNaN(parsedDate.getTime())) {
            setError('La date et heure de séance est invalide.')
            return
        }

        const parsedDuration = Number(durationMin)
        if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
            setError('La durée doit être un nombre positif.')
            return
        }

        try {
            await onSubmit({
                sessionType,
                startedAt: parsedDate,
                durationMin: parsedDuration,
                sourceName: sourceName.trim() || undefined,
                notes: notes.trim() || undefined,
                strengthExerciseCount:
                    sessionType === 'strength'
                        ? Number(strengthExerciseCount || 0)
                        : undefined,
                hiitRounds:
                    sessionType === 'hiit' ? Number(hiitRounds || 0) : undefined,
                hiitExerciseCount:
                    sessionType === 'hiit'
                        ? Number(hiitExerciseCount || 0)
                        : undefined,
                runningType:
                    sessionType === 'running'
                        ? runningType.trim() || 'Footing'
                        : undefined,
                distanceKm:
                    sessionType === 'running' && distanceKm.trim()
                        ? Number(distanceKm)
                        : undefined,
                breathingCompletedCycles:
                    sessionType === 'breathing' && breathingCompletedCycles.trim()
                        ? Number(breathingCompletedCycles)
                        : undefined,
            })
        } catch (submitError) {
            if (submitError instanceof Error && submitError.message) {
                setError(submitError.message)
            } else {
                setError('Impossible d’ajouter la séance pour le moment.')
            }
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            width={720}
            onClose={onClose}
            onRequestClose={onClose}
        >
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                <h5 className="text-2xl font-bold">Ajouter une séance passée</h5>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Saisis une séance oubliée pour garder un historique complet.
                </p>

                {error && (
                    <Alert type="danger" className="mt-4">
                        {error}
                    </Alert>
                )}

                <FormContainer className="mt-4" layout="vertical">
                    <div className="grid gap-3 md:grid-cols-2">
                        <FormItem label="Type de séance">
                            <Input
                                asElement="select"
                                value={sessionType}
                                onChange={(event) =>
                                    setSessionType(event.target.value as SessionType)
                                }
                            >
                                {SESSION_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Input>
                        </FormItem>

                        <FormItem label={titleLabel}>
                            <Input
                                value={sourceName}
                                placeholder="Ex: Push du lundi"
                                onChange={(event) => setSourceName(event.target.value)}
                            />
                        </FormItem>

                        <FormItem label="Date & heure">
                            <Input
                                type="datetime-local"
                                value={startedAt}
                                onChange={(event) => setStartedAt(event.target.value)}
                            />
                        </FormItem>

                        <FormItem label="Durée (min)">
                            <Input
                                type="number"
                                min={1}
                                max={1440}
                                inputMode="numeric"
                                value={durationMin}
                                onChange={(event) => setDurationMin(event.target.value)}
                            />
                        </FormItem>

                        {sessionType === 'strength' && (
                            <FormItem label="Nombre d’exercices">
                                <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    inputMode="numeric"
                                    value={strengthExerciseCount}
                                    onChange={(event) =>
                                        setStrengthExerciseCount(event.target.value)
                                    }
                                />
                            </FormItem>
                        )}

                        {sessionType === 'hiit' && (
                            <>
                                <FormItem label="Tours complétés">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={30}
                                        inputMode="numeric"
                                        value={hiitRounds}
                                        onChange={(event) =>
                                            setHiitRounds(event.target.value)
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Exercices HIIT">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={30}
                                        inputMode="numeric"
                                        value={hiitExerciseCount}
                                        onChange={(event) =>
                                            setHiitExerciseCount(event.target.value)
                                        }
                                    />
                                </FormItem>
                            </>
                        )}

                        {sessionType === 'running' && (
                            <>
                                <FormItem label="Type de course">
                                    <Input
                                        value={runningType}
                                        onChange={(event) =>
                                            setRunningType(event.target.value)
                                        }
                                        placeholder="Footing"
                                    />
                                </FormItem>
                                <FormItem label="Distance (km, optionnel)">
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        inputMode="decimal"
                                        value={distanceKm}
                                        onChange={(event) =>
                                            setDistanceKm(event.target.value)
                                        }
                                    />
                                </FormItem>
                            </>
                        )}

                        {sessionType === 'breathing' && (
                            <FormItem label="Cycles complétés (optionnel)">
                                <Input
                                    type="number"
                                    min={1}
                                    max={999}
                                    inputMode="numeric"
                                    value={breathingCompletedCycles}
                                    onChange={(event) =>
                                        setBreathingCompletedCycles(event.target.value)
                                    }
                                />
                            </FormItem>
                        )}
                    </div>

                    <FormItem label="Notes (optionnel)">
                        <Input
                            textArea
                            value={notes}
                            placeholder="Ressenti, intensité, contexte..."
                            onChange={(event) => setNotes(event.target.value)}
                        />
                    </FormItem>
                </FormContainer>
            </div>

            <div className="rounded-b-lg bg-gray-100 px-6 py-3 dark:bg-gray-700">
                <div className="flex items-center justify-end gap-2">
                    <Button size="sm" onClick={onClose} disabled={isSubmitting}>
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        loading={isSubmitting}
                        onClick={handleSubmit}
                    >
                        Ajouter la séance
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default PastWorkoutSessionDialog
