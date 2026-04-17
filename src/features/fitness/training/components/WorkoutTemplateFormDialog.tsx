import { useEffect, useState } from 'react'
import { Alert, Button, Dialog, FormContainer, FormItem, Input } from '@/components/ui'
import type { Exercise } from '@/features/fitness/training/types/exercise'
import type {
    TemplateWorkoutSet,
    WorkoutTemplateExercise,
    WorkoutTemplateInput,
} from '@/features/fitness/training/types/workoutSession'
import {
    HiOutlinePlus,
    HiOutlineTrash,
} from 'react-icons/hi'

type WorkoutTemplateFormMode = 'create' | 'edit'

interface WorkoutTemplateFormDialogProps {
    isOpen: boolean
    mode: WorkoutTemplateFormMode
    isSubmitting: boolean
    initialValues: WorkoutTemplateInput
    exerciseOptions: Exercise[]
    onClose: () => void
    onSubmit: (values: WorkoutTemplateInput) => Promise<void>
}

interface TemplateFormErrors {
    name?: string
    exercises?: string
}

const TEMPLATE_TAG_SUGGESTIONS = ['push', 'pull', 'legs'] as const

const createDefaultSet = (index: number): TemplateWorkoutSet => ({
    setNumber: index + 1,
    targetReps: '10-12',
    targetWeight: '',
})

const createDefaultExercise = (index: number): WorkoutTemplateExercise => ({
    exerciseSource: 'user',
    exerciseId: null,
    exerciseSnapshot: {
        name: `Exercice ${index + 1}`,
        muscleGroup: '',
        equipment: '',
    },
    name: `Exercice ${index + 1}`,
    muscleGroup: '',
    equipment: '',
    plannedSets: [createDefaultSet(0)],
})

const exerciseOptionValue = (exercise: Exercise) =>
    `${exercise.exerciseSource}:${exercise.id}`

const getDialogTitle = (mode: WorkoutTemplateFormMode) => {
    return mode === 'create' ? 'Nouveau template' : 'Modifier le template'
}

const validateTemplateForm = (values: WorkoutTemplateInput): TemplateFormErrors => {
    const errors: TemplateFormErrors = {}

    if (!values.name.trim()) {
        errors.name = 'Le nom du template est requis.'
    }

    if (!values.exercises.length) {
        errors.exercises = 'Ajoute au moins un exercice.'
        return errors
    }

    const invalidExercise = values.exercises.find((exercise) => {
        return !exercise.name.trim() || exercise.plannedSets.length === 0
    })

    if (invalidExercise) {
        errors.exercises =
            'Chaque exercice doit avoir un nom et au moins un set.'
    }

    return errors
}

const normalizeTagsInput = (value: string): string[] => {
    return Array.from(
        new Set(
            value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
                .slice(0, 12),
        ),
    )
}

const WorkoutTemplateFormDialog = ({
    isOpen,
    mode,
    isSubmitting,
    initialValues,
    exerciseOptions,
    onClose,
    onSubmit,
}: WorkoutTemplateFormDialogProps) => {
    const [values, setValues] = useState<WorkoutTemplateInput>(initialValues)
    const [tagsInput, setTagsInput] = useState(initialValues.tags.join(', '))
    const [errors, setErrors] = useState<TemplateFormErrors>({})
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            const safeExercises =
                initialValues.exercises.length > 0
                    ? initialValues.exercises
                    : [createDefaultExercise(0)]

            setValues({
                name: initialValues.name,
                tags: initialValues.tags,
                exercises: safeExercises,
            })
            setTagsInput(initialValues.tags.join(', '))
            setErrors({})
            setSubmitError(null)
        }
    }, [initialValues, isOpen])

    const setFieldValue = (field: keyof WorkoutTemplateInput, value: string | string[]) => {
        setValues((prev) => ({
            ...prev,
            [field]: value,
        }))

        setErrors((prev) => ({
            ...prev,
            name: field === 'name' ? undefined : prev.name,
            exercises: field === 'exercises' ? undefined : prev.exercises,
        }))
    }

    const setExerciseName = (exerciseIndex: number, name: string) => {
        setValues((prev) => ({
            ...prev,
            exercises: prev.exercises.map((exercise, index) => {
                if (index !== exerciseIndex) {
                    return exercise
                }

                return {
                    ...exercise,
                    name,
                    exerciseSnapshot: {
                        name,
                        muscleGroup: exercise.muscleGroup || '',
                        equipment: exercise.equipment || '',
                    },
                }
            }),
        }))

        setErrors((prev) => ({
            ...prev,
            exercises: undefined,
        }))
    }

    const getExerciseSelectionValue = (exercise: WorkoutTemplateExercise) => {
        if (!exercise.exerciseId) {
            return ''
        }

        const source = exercise.exerciseSource || 'user'
        return `${source}:${exercise.exerciseId}`
    }

    const setExerciseFromLibrary = (exerciseIndex: number, value: string) => {
        if (!value) {
            setValues((prev) => ({
                ...prev,
                exercises: prev.exercises.map((exercise, index) => {
                    if (index !== exerciseIndex) {
                        return exercise
                    }

                    return {
                        ...exercise,
                        exerciseSource: 'user',
                        exerciseId: null,
                        exerciseSnapshot: {
                            name: exercise.name,
                            muscleGroup: exercise.muscleGroup || '',
                            equipment: exercise.equipment || '',
                        },
                    }
                }),
            }))
            return
        }

        const selected = exerciseOptions.find(
            (exercise) => exerciseOptionValue(exercise) === value,
        )

        if (!selected) {
            return
        }

        setValues((prev) => ({
            ...prev,
            exercises: prev.exercises.map((exercise, index) => {
                if (index !== exerciseIndex) {
                    return exercise
                }

                return {
                    ...exercise,
                    exerciseSource: selected.exerciseSource,
                    exerciseId: selected.id,
                    name: selected.name,
                    muscleGroup: selected.muscleGroup,
                    equipment: selected.equipment,
                    exerciseSnapshot: {
                        name: selected.name,
                        muscleGroup: selected.muscleGroup,
                        equipment: selected.equipment,
                    },
                }
            }),
        }))
    }

    const setExerciseSetField = (
        exerciseIndex: number,
        setIndex: number,
        field: 'targetReps' | 'targetWeight',
        value: string,
    ) => {
        setValues((prev) => ({
            ...prev,
            exercises: prev.exercises.map((exercise, index) => {
                if (index !== exerciseIndex) {
                    return exercise
                }

                return {
                    ...exercise,
                    plannedSets: exercise.plannedSets.map((set, currentSetIndex) => {
                        if (currentSetIndex !== setIndex) {
                            return set
                        }

                        return {
                            ...set,
                            [field]: value,
                        }
                    }),
                }
            }),
        }))
    }

    const addExercise = () => {
        setValues((prev) => ({
            ...prev,
            exercises: [...prev.exercises, createDefaultExercise(prev.exercises.length)],
        }))

        setErrors((prev) => ({
            ...prev,
            exercises: undefined,
        }))
    }

    const removeExercise = (exerciseIndex: number) => {
        setValues((prev) => {
            if (prev.exercises.length <= 1) {
                return prev
            }

            return {
                ...prev,
                exercises: prev.exercises.filter((_, index) => index !== exerciseIndex),
            }
        })
    }

    const addSet = (exerciseIndex: number) => {
        setValues((prev) => ({
            ...prev,
            exercises: prev.exercises.map((exercise, index) => {
                if (index !== exerciseIndex) {
                    return exercise
                }

                return {
                    ...exercise,
                    plannedSets: [
                        ...exercise.plannedSets,
                        createDefaultSet(exercise.plannedSets.length),
                    ],
                }
            }),
        }))
    }

    const removeSet = (exerciseIndex: number, setIndex: number) => {
        setValues((prev) => ({
            ...prev,
            exercises: prev.exercises.map((exercise, index) => {
                if (index !== exerciseIndex || exercise.plannedSets.length <= 1) {
                    return exercise
                }

                return {
                    ...exercise,
                    plannedSets: exercise.plannedSets
                        .filter((_, idx) => idx !== setIndex)
                        .map((set, idx) => ({
                            ...set,
                            setNumber: idx + 1,
                        })),
                }
            }),
        }))
    }

    const applySuggestedTag = (tag: string) => {
        setValues((prev) => {
            if (prev.tags.includes(tag)) {
                return prev
            }

            const nextTags = [...prev.tags, tag]
            setTagsInput(nextTags.join(', '))

            return {
                ...prev,
                tags: nextTags,
            }
        })
    }

    const handleSubmit = async () => {
        const validationErrors = validateTemplateForm(values)
        const hasValidationErrors = Object.values(validationErrors).some(Boolean)

        if (hasValidationErrors) {
            setErrors(validationErrors)
            return
        }

        try {
            setSubmitError(null)
            await onSubmit({
                name: values.name.trim(),
                tags: values.tags,
                exercises: values.exercises.map((exercise) => ({
                    ...exercise,
                    exerciseSource: exercise.exerciseSource || 'user',
                    exerciseId: exercise.exerciseId || null,
                    name: exercise.name.trim(),
                    exerciseSnapshot: {
                        name: exercise.name.trim(),
                        muscleGroup: exercise.muscleGroup?.trim() || '',
                        equipment: exercise.equipment?.trim() || '',
                    },
                    plannedSets: exercise.plannedSets.map((set, index) => ({
                        setNumber: index + 1,
                        targetReps: set.targetReps?.trim() || undefined,
                        targetWeight: set.targetWeight?.trim() || undefined,
                    })),
                })),
            })
        } catch (submitMutationError) {
            if (
                submitMutationError instanceof Error &&
                submitMutationError.message
            ) {
                setSubmitError(submitMutationError.message)
            } else {
                setSubmitError('Une erreur est survenue. Merci de réessayer.')
            }
        }
    }

    const handleClose = () => {
        if (isSubmitting) {
            return
        }

        onClose()
    }

    return (
        <Dialog
            width={900}
            isOpen={isOpen}
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                <h5>{getDialogTitle(mode)}</h5>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Construis un template réutilisable pour démarrer une séance en un clic.
                </p>

                {submitError && (
                    <Alert type="danger" className="mt-4">
                        {submitError}
                    </Alert>
                )}

                <FormContainer className="mt-4" layout="vertical">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <FormItem
                            label="Nom du template"
                            asterisk
                            invalid={Boolean(errors.name)}
                            errorMessage={errors.name}
                        >
                            <Input
                                value={values.name}
                                placeholder="Ex: Push lourd"
                                onChange={(event) =>
                                    setFieldValue('name', event.target.value)
                                }
                            />
                        </FormItem>

                        <FormItem label="Tags (optionnel)">
                            <Input
                                value={tagsInput}
                                placeholder="push, pull, legs"
                                onChange={(event) => {
                                    const rawValue = event.target.value
                                    setTagsInput(rawValue)
                                    setFieldValue('tags', normalizeTagsInput(rawValue))
                                }}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                                {TEMPLATE_TAG_SUGGESTIONS.map((tag) => (
                                    <Button
                                        key={tag}
                                        size="xs"
                                        onClick={() => applySuggestedTag(tag)}
                                    >
                                        {tag}
                                    </Button>
                                ))}
                            </div>
                        </FormItem>
                    </div>

                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="font-semibold">Exercices</p>
                            <Button
                                size="xs"
                                icon={<HiOutlinePlus />}
                                onClick={addExercise}
                            >
                                Ajouter exercice
                            </Button>
                        </div>

                        {errors.exercises && (
                            <Alert type="danger" className="mb-3">
                                {errors.exercises}
                            </Alert>
                        )}

                        <div className="space-y-3">
                            {values.exercises.map((exercise, exerciseIndex) => (
                                <div
                                    key={`${exerciseIndex}-${exercise.name}`}
                                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                                >
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-semibold">
                                            Exercice {exerciseIndex + 1}
                                        </p>
                                        <Button
                                            size="xs"
                                            variant="twoTone"
                                            icon={<HiOutlineTrash />}
                                            onClick={() => removeExercise(exerciseIndex)}
                                            disabled={values.exercises.length <= 1}
                                        >
                                            Supprimer
                                        </Button>
                                    </div>

                                    <div className="grid gap-3 lg:grid-cols-2">
                                        <FormItem label="Bibliothèque (optionnel)">
                                            <select
                                                className="input"
                                                value={getExerciseSelectionValue(exercise)}
                                                onChange={(event) =>
                                                    setExerciseFromLibrary(
                                                        exerciseIndex,
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">Exercice libre</option>
                                                {exerciseOptions.map((option) => (
                                                    <option
                                                        key={exerciseOptionValue(option)}
                                                        value={exerciseOptionValue(option)}
                                                    >
                                                        {option.name} (
                                                        {option.exerciseSource === 'global'
                                                            ? 'Global'
                                                            : 'Custom'}
                                                        )
                                                    </option>
                                                ))}
                                            </select>
                                        </FormItem>
                                        <FormItem label="Nom" asterisk>
                                            <Input
                                                value={exercise.name}
                                                placeholder="Ex: Développé couché"
                                                onChange={(event) =>
                                                    setExerciseName(
                                                        exerciseIndex,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </FormItem>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-sm font-semibold">Sets</p>
                                            <Button
                                                size="xs"
                                                icon={<HiOutlinePlus />}
                                                onClick={() => addSet(exerciseIndex)}
                                            >
                                                Ajouter set
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            {exercise.plannedSets.map((set, setIndex) => (
                                                <div
                                                    key={`${exerciseIndex}-${setIndex}`}
                                                    className="grid gap-2 rounded-lg bg-gray-50 p-3 md:grid-cols-[1fr_1fr_auto] dark:bg-gray-800/60"
                                                >
                                                    <Input
                                                        value={set.targetReps || ''}
                                                        placeholder="Reps (ex: 8-10)"
                                                        onChange={(event) =>
                                                            setExerciseSetField(
                                                                exerciseIndex,
                                                                setIndex,
                                                                'targetReps',
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                    <Input
                                                        value={set.targetWeight || ''}
                                                        placeholder="Charge cible (optionnel)"
                                                        onChange={(event) =>
                                                            setExerciseSetField(
                                                                exerciseIndex,
                                                                setIndex,
                                                                'targetWeight',
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                    <Button
                                                        size="xs"
                                                        variant="twoTone"
                                                        icon={<HiOutlineTrash />}
                                                        onClick={() =>
                                                            removeSet(
                                                                exerciseIndex,
                                                                setIndex,
                                                            )
                                                        }
                                                        disabled={
                                                            exercise.plannedSets.length <= 1
                                                        }
                                                    >
                                                        Suppr.
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </FormContainer>
            </div>

            <div className="rounded-b-lg bg-gray-100 px-6 py-3 text-right dark:bg-gray-700">
                <Button
                    className="ltr:mr-2 rtl:ml-2"
                    size="sm"
                    onClick={handleClose}
                >
                    Annuler
                </Button>
                <Button
                    size="sm"
                    variant="solid"
                    loading={isSubmitting}
                    onClick={handleSubmit}
                >
                    {mode === 'create' ? 'Créer le template' : 'Enregistrer'}
                </Button>
            </div>
        </Dialog>
    )
}

export default WorkoutTemplateFormDialog
