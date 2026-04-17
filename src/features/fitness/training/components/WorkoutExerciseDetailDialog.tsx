import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Dialog, FormContainer, FormItem, Input, Tag } from '@/components/ui'
import type {
    PerformedWorkoutExercise,
    PerformedWorkoutSet,
    PlannedWorkoutExercise,
    SavePerformedExerciseInput,
} from '@/features/fitness/training/types/workoutSession'
import { isCardioNoSetsExercise } from '@/features/fitness/training/utils/exerciseKind'
import { HiOutlineMinusCircle, HiOutlinePlusCircle } from 'react-icons/hi'

interface WorkoutExerciseDetailDialogProps {
    isOpen: boolean
    plannedExercise: PlannedWorkoutExercise | null
    performedExercise: PerformedWorkoutExercise | null
    isSaving: boolean
    onClose: () => void
    onSave: (input: SavePerformedExerciseInput) => Promise<void>
    onComplete: (input: SavePerformedExerciseInput) => Promise<void>
}

interface EditableSet {
    id: string
    reps: string
    weight: string
    notes: string
}

const toEditableSets = (
    plannedExercise: PlannedWorkoutExercise | null,
    performedExercise: PerformedWorkoutExercise | null,
    isNoSetsExercise: boolean,
): EditableSet[] => {
    if (isNoSetsExercise) {
        return []
    }

    if (performedExercise?.sets?.length) {
        return performedExercise.sets.map((set, index) => ({
            id: `set_${index + 1}`,
            reps: set.reps,
            weight: set.weight,
            notes: set.notes || '',
        }))
    }

    if (plannedExercise?.plannedSets?.length) {
        return plannedExercise.plannedSets.map((set, index) => ({
            id: `set_${index + 1}`,
            reps: set.targetReps || '',
            weight: set.targetWeight || '',
            notes: '',
        }))
    }

    return [
        {
            id: 'set_1',
            reps: '',
            weight: '',
            notes: '',
        },
    ]
}

const toPerformedSets = (editableSets: EditableSet[]): PerformedWorkoutSet[] => {
    return editableSets.map((set, index) => ({
        setNumber: index + 1,
        reps: set.reps,
        weight: set.weight,
        notes: set.notes,
    }))
}

const WorkoutExerciseDetailDialog = ({
    isOpen,
    plannedExercise,
    performedExercise,
    isSaving,
    onClose,
    onSave,
    onComplete,
}: WorkoutExerciseDetailDialogProps) => {
    const [sets, setSets] = useState<EditableSet[]>([])
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)
    const isNoSetsExercise = isCardioNoSetsExercise(plannedExercise)

    useEffect(() => {
        if (isOpen) {
            setSets(
                toEditableSets(plannedExercise, performedExercise, isNoSetsExercise),
            )
            setNotes(performedExercise?.notes || '')
            setError(null)
        }
    }, [isOpen, plannedExercise, performedExercise, isNoSetsExercise])

    const currentStatus = useMemo(() => {
        return performedExercise?.status || 'not_started'
    }, [performedExercise?.status])

    const updateSet = (id: string, field: keyof EditableSet, value: string) => {
        setSets((previous) =>
            previous.map((set) => (set.id === id ? { ...set, [field]: value } : set)),
        )
    }

    const addSet = () => {
        setSets((previous) => [
            ...previous,
            {
                id: `set_${previous.length + 1}_${Date.now()}`,
                reps: '',
                weight: '',
                notes: '',
            },
        ])
    }

    const removeSet = (id: string) => {
        setSets((previous) => {
            const next = previous.filter((set) => set.id !== id)
            return next.length
                ? next
                : [
                      {
                          id: 'set_1',
                          reps: '',
                          weight: '',
                          notes: '',
                      },
                  ]
        })
    }

    const buildPayload = (): SavePerformedExerciseInput => {
        if (!plannedExercise) {
            throw new Error('Exercice introuvable.')
        }

        return {
            plannedExerciseId: plannedExercise.plannedExerciseId,
            exerciseSource: plannedExercise.exerciseSource,
            exerciseId: plannedExercise.exerciseId,
            exerciseSnapshot: plannedExercise.exerciseSnapshot,
            name: plannedExercise.name,
            sets: isNoSetsExercise ? [] : toPerformedSets(sets),
            notes,
            status: performedExercise?.status || 'in_progress',
        }
    }

    const runAction = async (
        action: (input: SavePerformedExerciseInput) => Promise<void>,
    ) => {
        try {
            setError(null)
            await action(buildPayload())
            onClose()
        } catch (submitError) {
            if (submitError instanceof Error) {
                setError(submitError.message)
            } else {
                setError('Une erreur est survenue. Merci de réessayer.')
            }
        }
    }

    const handleClose = () => {
        if (!isSaving) {
            onClose()
        }
    }

    return (
        <Dialog
            width={760}
            isOpen={isOpen}
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <div className="flex max-h-[78vh] flex-col">
                <div className="overflow-y-auto px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h5>{plannedExercise?.name || 'Exercice'}</h5>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Tu peux modifier librement cet exercice puis le marquer terminé.
                            </p>
                        </div>
                        <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            {currentStatus === 'completed'
                                ? 'Terminé'
                                : currentStatus === 'in_progress'
                                  ? 'En cours'
                                  : 'Non commencé'}
                        </Tag>
                    </div>

                    {error && (
                        <Alert type="danger" className="mt-4">
                            {error}
                        </Alert>
                    )}

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                            {plannedExercise?.muscleGroup || 'Groupe musculaire non défini'}
                        </Tag>
                        <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            {plannedExercise?.equipment || 'Matériel non défini'}
                        </Tag>
                    </div>

                    {isNoSetsExercise ? (
                        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-400/30 dark:bg-blue-500/10">
                            <p className="text-sm text-blue-700 dark:text-blue-100">
                                Cet exercice est traité en mode cardio: pas de sets a saisir.
                                Note plutot la duree, la distance ou l'allure.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                            <div className="mb-3 flex items-center justify-between">
                                <h6 className="font-semibold">Sets réalisés</h6>
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<HiOutlinePlusCircle />}
                                    onClick={addSet}
                                >
                                    Ajouter un set
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {sets.map((set, index) => (
                                    <div
                                        key={set.id}
                                        className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-sm font-semibold">
                                                Set {index + 1}
                                            </p>
                                            <Button
                                                size="xs"
                                                variant="plain"
                                                icon={<HiOutlineMinusCircle />}
                                                onClick={() => removeSet(set.id)}
                                            >
                                                Retirer
                                            </Button>
                                        </div>

                                        <FormContainer
                                            layout="vertical"
                                            className="grid gap-2 md:grid-cols-3"
                                        >
                                            <FormItem label="Répétitions">
                                                <Input
                                                    value={set.reps}
                                                    placeholder="Ex: 10"
                                                    onChange={(event) =>
                                                        updateSet(
                                                            set.id,
                                                            'reps',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </FormItem>
                                            <FormItem label="Charge">
                                                <Input
                                                    value={set.weight}
                                                    placeholder="Ex: 40 kg"
                                                    onChange={(event) =>
                                                        updateSet(
                                                            set.id,
                                                            'weight',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </FormItem>
                                            <FormItem label="Notes set">
                                                <Input
                                                    value={set.notes}
                                                    placeholder="Optionnel"
                                                    onChange={(event) =>
                                                        updateSet(
                                                            set.id,
                                                            'notes',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </FormItem>
                                        </FormContainer>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <FormContainer layout="vertical" className="mt-4">
                        <FormItem label="Notes exercice">
                            <Input
                                textArea
                                rows={3}
                                value={notes}
                                placeholder={
                                    isNoSetsExercise
                                        ? 'Ex: 5 km en 28:40, allure moyenne 5:44/km.'
                                        : 'Comment tu t’es senti, ajustements, etc.'
                                }
                                onChange={(event) => setNotes(event.target.value)}
                            />
                        </FormItem>
                    </FormContainer>
                </div>

                <div className="rounded-b-lg bg-gray-100 px-6 py-3 text-right dark:bg-gray-700">
                    <Button
                        className="ltr:mr-2 rtl:ml-2"
                        size="sm"
                        onClick={handleClose}
                    >
                        Fermer
                    </Button>
                    <Button
                        className="ltr:mr-2 rtl:ml-2"
                        size="sm"
                        loading={isSaving}
                        onClick={() => runAction(onSave)}
                    >
                        Sauvegarder
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        loading={isSaving}
                        onClick={() => runAction(onComplete)}
                    >
                        Marquer terminé
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default WorkoutExerciseDetailDialog
