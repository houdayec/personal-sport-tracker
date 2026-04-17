import { useEffect, useMemo, useState, type DragEvent } from 'react'
import {
    Alert,
    Button,
    Dialog,
    FormContainer,
    FormItem,
    Input,
    Select,
} from '@/components/ui'
import type { Exercise } from '@/features/fitness/training/types/exercise'
import { listGlobalRunningTypes } from '@/features/fitness/training/services/runningTypeService'
import type {
    HiitTemplateConfig,
    RunningTemplateConfig,
    SessionType,
    TemplateWorkoutSet,
    WorkoutTemplateExercise,
    WorkoutTemplateInput,
} from '@/features/fitness/training/types/workoutSession'
import {
    formatRunningTypeLabel,
    getFallbackRunningTypeOptions,
    normalizeRunningTypeValue,
    type RunningTypeOption,
} from '@/features/fitness/training/utils/runningType'
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

interface ExerciseLibraryOption {
    value: string
    label: string
    exercise: Exercise
}

interface SelectOption {
    value: string
    label: string
}

interface HiitExerciseOption {
    value: string
    label: string
}

const TEMPLATE_TAG_SUGGESTIONS = ['push', 'pull', 'legs'] as const
const PLACEHOLDER_EXERCISE_NAME_REGEX = /^Exercice\s+\d+$/i
const SESSION_TYPE_OPTIONS: SelectOption[] = [
    { value: 'strength', label: 'Force' },
    { value: 'hiit', label: 'HIIT' },
    { value: 'running', label: 'Course' },
]
const HIIT_FORMAT_OPTIONS: SelectOption[] = [
    { value: 'interval', label: 'Intervalles' },
    { value: 'circuit', label: 'Circuit' },
]
const DEFAULT_RUNNING_TYPE_VALUE = 'Footing'
const FALLBACK_RUNNING_TYPE_OPTIONS = getFallbackRunningTypeOptions()

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

const createDefaultHiitConfig = (): HiitTemplateConfig => ({
    format: 'interval',
    rounds: 4,
    workSec: 40,
    restSec: 20,
    exercises: [],
})

const createDefaultRunningConfig = (): RunningTemplateConfig => ({
    runType: DEFAULT_RUNNING_TYPE_VALUE,
    targetDistanceKm: 5,
    targetDurationMin: 30,
})

const ensureTemplateInputDefaults = (input: WorkoutTemplateInput): WorkoutTemplateInput => {
    const sessionType = input.sessionType || 'strength'
    const exercises =
        input.exercises && input.exercises.length > 0
            ? input.exercises
            : [createDefaultExercise(0)]

    return {
        name: input.name || '',
        tags: input.tags || [],
        sessionType,
        description: input.description || '',
        isArchived: Boolean(input.isArchived),
        exercises,
        strengthConfig: {
            exercises: input.strengthConfig?.exercises?.length
                ? input.strengthConfig.exercises
                : exercises,
        },
        hiitConfig: {
            ...createDefaultHiitConfig(),
            ...(input.hiitConfig || {}),
            exercises:
                input.hiitConfig?.exercises && input.hiitConfig.exercises.length > 0
                    ? input.hiitConfig.exercises
                    : createDefaultHiitConfig().exercises,
        },
        runningConfig: {
            ...createDefaultRunningConfig(),
            ...(input.runningConfig || {}),
        },
    }
}

const exerciseOptionValue = (exercise: Exercise) =>
    `${exercise.exerciseSource}:${exercise.id}`

const toExerciseLibraryOption = (exercise: Exercise): ExerciseLibraryOption => {
    const sourceLabel = exercise.exerciseSource === 'global' ? 'Commun' : 'Perso'
    const details = [exercise.muscleGroup, exercise.equipment]
        .map((item) => item.trim())
        .filter(Boolean)
        .join(' · ')

    const label = details
        ? `${exercise.name} · ${sourceLabel} · ${details}`
        : `${exercise.name} · ${sourceLabel}`

    return {
        value: exerciseOptionValue(exercise),
        label,
        exercise,
    }
}

const getDialogTitle = (mode: WorkoutTemplateFormMode) => {
    return mode === 'create' ? 'Nouveau template' : 'Modifier le template'
}

const validateTemplateForm = (values: WorkoutTemplateInput): TemplateFormErrors => {
    const errors: TemplateFormErrors = {}

    if (!values.name.trim()) {
        errors.name = 'Le nom du template est requis.'
    }

    if (values.sessionType === 'strength') {
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
    }

    if (values.sessionType === 'hiit') {
        if (!values.hiitConfig?.exercises?.length) {
            errors.exercises = 'Ajoute au moins un exercice HIIT.'
        }
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
    const [values, setValues] = useState<WorkoutTemplateInput>(
        ensureTemplateInputDefaults(initialValues),
    )
    const [tagsInput, setTagsInput] = useState(initialValues.tags.join(', '))
    const [errors, setErrors] = useState<TemplateFormErrors>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [runningTypeOptions, setRunningTypeOptions] = useState<RunningTypeOption[]>(
        FALLBACK_RUNNING_TYPE_OPTIONS,
    )
    const [isRunningTypesLoading, setIsRunningTypesLoading] = useState(false)
    const [draggedHiitIndex, setDraggedHiitIndex] = useState<number | null>(null)

    const exerciseLibraryOptions = useMemo<ExerciseLibraryOption[]>(() => {
        return exerciseOptions
            .map(toExerciseLibraryOption)
            .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name, 'fr'))
    }, [exerciseOptions])
    const runningTypeSelectOptions = useMemo<SelectOption[]>(() => {
        return runningTypeOptions.map((option) => ({
            value: option.value,
            label: option.label,
        }))
    }, [runningTypeOptions])
    const hiitExerciseOptions = useMemo<HiitExerciseOption[]>(() => {
        const seenNames = new Set<string>()

        return exerciseOptions
            .slice()
            .sort((a, b) =>
                a.name.localeCompare(b.name, 'fr', {
                    sensitivity: 'base',
                }),
            )
            .map((exercise) => {
                const normalized = exercise.name.trim()
                const key = normalized.toLowerCase()

                if (!normalized || seenNames.has(key)) {
                    return null
                }

                seenNames.add(key)

                return {
                    value: normalized,
                    label: normalized,
                }
            })
            .filter((option): option is HiitExerciseOption => Boolean(option))
    }, [exerciseOptions])

    const findExerciseFromLibrary = (
        source: ExerciseLibraryOption['exercise']['exerciseSource'],
        exerciseId: string | null | undefined,
    ) => {
        if (!exerciseId) {
            return null
        }

        return (
            exerciseOptions.find(
                (exercise) =>
                    exercise.id === exerciseId &&
                    exercise.exerciseSource === source,
            ) || null
        )
    }

    const resolveExerciseNameForSave = (exercise: WorkoutTemplateExercise): string => {
        const source = exercise.exerciseSource || 'user'
        const linkedExercise = findExerciseFromLibrary(source, exercise.exerciseId)

        const typedName = exercise.name.trim()
        const snapshotName = exercise.exerciseSnapshot?.name?.trim() || ''
        const linkedName = linkedExercise?.name.trim() || ''

        const typedLooksLikePlaceholder =
            !typedName || PLACEHOLDER_EXERCISE_NAME_REGEX.test(typedName)
        const snapshotLooksLikePlaceholder =
            !snapshotName || PLACEHOLDER_EXERCISE_NAME_REGEX.test(snapshotName)

        if (linkedName && (typedLooksLikePlaceholder || snapshotLooksLikePlaceholder)) {
            return linkedName
        }

        return typedName || snapshotName || linkedName
    }

    useEffect(() => {
        if (isOpen) {
            const safeInput = ensureTemplateInputDefaults(initialValues)
            setValues(safeInput)
            setTagsInput((safeInput.tags || []).join(', '))
            setErrors({})
            setSubmitError(null)
        }
    }, [initialValues, isOpen])

    useEffect(() => {
        let isMounted = true

        const loadRunningTypes = async () => {
            if (!isOpen) {
                return
            }

            setIsRunningTypesLoading(true)

            try {
                const runningTypes = await listGlobalRunningTypes()

                if (!isMounted) {
                    return
                }

                if (runningTypes.length > 0) {
                    const merged = new Map<string, RunningTypeOption>()

                    runningTypes.forEach((runningType) => {
                        const value = normalizeRunningTypeValue(runningType.name, '')

                        if (!value) {
                            return
                        }

                        merged.set(value.toLowerCase(), {
                            value,
                            label: value,
                            category: runningType.category || 'running',
                            description: runningType.description || '',
                            defaultGoal: runningType.defaultGoal || 'time',
                            muscleGroup: runningType.muscleGroup || 'cardio',
                        })
                    })

                    FALLBACK_RUNNING_TYPE_OPTIONS.forEach((fallbackOption) => {
                        const key = fallbackOption.value.toLowerCase()
                        if (!merged.has(key)) {
                            merged.set(key, fallbackOption)
                        }
                    })

                    setRunningTypeOptions(Array.from(merged.values()))
                } else {
                    setRunningTypeOptions(FALLBACK_RUNNING_TYPE_OPTIONS)
                }
            } catch {
                if (isMounted) {
                    setRunningTypeOptions(FALLBACK_RUNNING_TYPE_OPTIONS)
                }
            } finally {
                if (isMounted) {
                    setIsRunningTypesLoading(false)
                }
            }
        }

        void loadRunningTypes()

        return () => {
            isMounted = false
        }
    }, [isOpen])

    const setFieldValue = (
        field: keyof WorkoutTemplateInput,
        value: string | string[] | boolean,
    ) => {
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

    const setSessionType = (sessionType: SessionType) => {
        setValues((prev) =>
            ensureTemplateInputDefaults({
                ...prev,
                sessionType,
            }),
        )
        setErrors((prev) => ({
            ...prev,
            exercises: undefined,
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

    const getExerciseSelectedOption = (exercise: WorkoutTemplateExercise) => {
        const value = getExerciseSelectionValue(exercise)

        if (!value) {
            return null
        }

        return (
            exerciseLibraryOptions.find((option) => option.value === value) || null
        )
    }

    const setExerciseFromLibrary = (
        exerciseIndex: number,
        option: ExerciseLibraryOption | null,
    ) => {
        if (!option) {
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

        const selected = option.exercise

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

    const setHiitField = (
        field: keyof HiitTemplateConfig,
        value: string | number | string[] | undefined,
    ) => {
        setValues((prev) => ({
            ...prev,
            hiitConfig: {
                ...createDefaultHiitConfig(),
                ...(prev.hiitConfig || {}),
                [field]: value,
            },
        }))
        setErrors((prev) => ({ ...prev, exercises: undefined }))
    }

    const setOrderedHiitExercises = (nextExercises: string[]) => {
        const normalized = Array.from(
            new Set(
                nextExercises.map((exercise) => exercise.trim()).filter(Boolean),
            ),
        )
        setHiitField('exercises', normalized)
    }

    const moveHiitExercise = (fromIndex: number, toIndex: number) => {
        const currentExercises = values.hiitConfig?.exercises || []

        if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= currentExercises.length ||
            toIndex >= currentExercises.length ||
            fromIndex === toIndex
        ) {
            return
        }

        const reordered = [...currentExercises]
        const [moved] = reordered.splice(fromIndex, 1)
        reordered.splice(toIndex, 0, moved)
        setOrderedHiitExercises(reordered)
    }

    const removeHiitExercise = (exerciseIndex: number) => {
        const currentExercises = values.hiitConfig?.exercises || []

        if (exerciseIndex < 0 || exerciseIndex >= currentExercises.length) {
            return
        }

        setOrderedHiitExercises(
            currentExercises.filter((_, index) => index !== exerciseIndex),
        )
    }

    const onHiitDragStart = (exerciseIndex: number) => {
        setDraggedHiitIndex(exerciseIndex)
    }

    const onHiitDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    const onHiitDrop = (targetIndex: number) => {
        if (draggedHiitIndex === null) {
            return
        }

        moveHiitExercise(draggedHiitIndex, targetIndex)
        setDraggedHiitIndex(null)
    }

    const onHiitDragEnd = () => {
        setDraggedHiitIndex(null)
    }

    const setRunningField = (
        field: keyof RunningTemplateConfig,
        value: string | number | undefined,
    ) => {
        setValues((prev) => ({
            ...prev,
            runningConfig: {
                ...createDefaultRunningConfig(),
                ...(prev.runningConfig || {}),
                [field]: value,
            },
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
            const normalizedExercises = values.exercises.map((exercise) => {
                const resolvedName = resolveExerciseNameForSave(exercise)

                return {
                    ...exercise,
                    exerciseSource: exercise.exerciseSource || 'user',
                    exerciseId: exercise.exerciseId || null,
                    name: resolvedName,
                    exerciseSnapshot: {
                        name: resolvedName,
                        muscleGroup: exercise.muscleGroup?.trim() || '',
                        equipment: exercise.equipment?.trim() || '',
                    },
                    plannedSets: exercise.plannedSets.map((set, index) => ({
                        setNumber: index + 1,
                        targetReps: set.targetReps?.trim() || undefined,
                        targetWeight: set.targetWeight?.trim() || undefined,
                    })),
                }
            })

            await onSubmit({
                name: values.name.trim(),
                tags: values.tags,
                sessionType: values.sessionType,
                description: values.description?.trim() || '',
                isArchived: Boolean(values.isArchived),
                exercises: values.sessionType === 'strength' ? normalizedExercises : [],
                strengthConfig:
                    values.sessionType === 'strength'
                        ? { exercises: normalizedExercises }
                        : { exercises: [] },
                hiitConfig:
                    values.sessionType === 'hiit'
                        ? {
                              ...createDefaultHiitConfig(),
                              ...(values.hiitConfig || {}),
                              exercises: (values.hiitConfig?.exercises || [])
                                  .map((exercise) => exercise.trim())
                                  .filter(Boolean),
                              rounds: Number(values.hiitConfig?.rounds || 0) || 4,
                              workSec: Number(values.hiitConfig?.workSec || 0) || 40,
                              restSec: Number(values.hiitConfig?.restSec || 0) || 20,
                              restBetweenRoundsSec:
                                  Number(values.hiitConfig?.restBetweenRoundsSec || 0) ||
                                  undefined,
                          }
                        : undefined,
                runningConfig:
                    values.sessionType === 'running'
                        ? {
                              ...createDefaultRunningConfig(),
                              ...(values.runningConfig || {}),
                              targetDistanceKm:
                                  Number(values.runningConfig?.targetDistanceKm || 0) ||
                                  undefined,
                              targetDurationMin:
                                  Number(values.runningConfig?.targetDurationMin || 0) ||
                                  undefined,
                          }
                        : undefined,
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

    const selectedSessionTypeOption =
        SESSION_TYPE_OPTIONS.find((option) => option.value === values.sessionType) || null
    const selectedHiitFormatOption =
        HIIT_FORMAT_OPTIONS.find(
            (option) => option.value === values.hiitConfig?.format,
        ) || HIIT_FORMAT_OPTIONS[0]
    const selectedRunTypeOption =
        runningTypeSelectOptions.find(
            (option) =>
                option.value.toLowerCase() ===
                normalizeRunningTypeValue(values.runningConfig?.runType, '')
                    .toLowerCase(),
        ) ||
        (values.runningConfig?.runType
            ? {
                  value: values.runningConfig.runType,
                  label: formatRunningTypeLabel(values.runningConfig.runType),
              }
            : null) ||
        runningTypeSelectOptions[0] || {
            value: DEFAULT_RUNNING_TYPE_VALUE,
            label: DEFAULT_RUNNING_TYPE_VALUE,
        }
    const selectedHiitExerciseOptions = (values.hiitConfig?.exercises || [])
        .map((exerciseName) => {
            const normalized = exerciseName.trim()
            if (!normalized) {
                return null
            }

            const existingOption = hiitExerciseOptions.find(
                (option) => option.value.toLowerCase() === normalized.toLowerCase(),
            )

            if (existingOption) {
                return existingOption
            }

            return {
                value: normalized,
                label: `${normalized} · indisponible dans la bibliothèque`,
            }
        })
        .filter((option): option is HiitExerciseOption => Boolean(option))

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
                        <FormItem label="Type de séance" asterisk>
                            <Select<SelectOption, false>
                                options={SESSION_TYPE_OPTIONS}
                                value={selectedSessionTypeOption}
                                isSearchable={false}
                                onChange={(option) =>
                                    setSessionType(
                                        (option?.value as SessionType) || 'strength',
                                    )
                                }
                            />
                        </FormItem>
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
                        <FormItem label="Description (optionnel)">
                            <Input
                                value={values.description || ''}
                                placeholder="Ex: Focus explosivité et cardio"
                                onChange={(event) =>
                                    setFieldValue('description', event.target.value)
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

                    {values.sessionType === 'strength' && (
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
                                                <Select<ExerciseLibraryOption, false>
                                                    options={exerciseLibraryOptions}
                                                    value={getExerciseSelectedOption(exercise)}
                                                    placeholder="Rechercher un exercice..."
                                                    isSearchable
                                                    isClearable
                                                    noOptionsMessage={({ inputValue }) =>
                                                        inputValue.trim()
                                                            ? 'Aucun exercice trouvé'
                                                            : 'Aucun exercice disponible'
                                                    }
                                                    onChange={(option) =>
                                                        setExerciseFromLibrary(
                                                            exerciseIndex,
                                                            option,
                                                        )
                                                    }
                                                />
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
                                                <p className="text-sm font-semibold">Séries</p>
                                                <Button
                                                    size="xs"
                                                    icon={<HiOutlinePlus />}
                                                    onClick={() => addSet(exerciseIndex)}
                                                >
                                                    Ajouter série
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
                                                            placeholder="Répétitions (ex: 8-10)"
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
                    )}

                    {values.sessionType === 'hiit' && (
                        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                            {errors.exercises && (
                                <Alert type="danger" className="mb-3">
                                    {errors.exercises}
                                </Alert>
                            )}
                            <div className="grid gap-3 lg:grid-cols-2">
                                <FormItem label="Format">
                                    <Select<SelectOption, false>
                                        options={HIIT_FORMAT_OPTIONS}
                                        value={selectedHiitFormatOption}
                                        isSearchable={false}
                                        onChange={(option) =>
                                            setHiitField('format', option?.value || 'interval')
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Tours">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={String(values.hiitConfig?.rounds || 4)}
                                        onChange={(event) =>
                                            setHiitField(
                                                'rounds',
                                                Number(event.target.value || 0) || 0,
                                            )
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Effort (sec)">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={String(values.hiitConfig?.workSec || 40)}
                                        onChange={(event) =>
                                            setHiitField(
                                                'workSec',
                                                Number(event.target.value || 0) || 0,
                                            )
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Repos (sec)">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={String(values.hiitConfig?.restSec || 20)}
                                        onChange={(event) =>
                                            setHiitField(
                                                'restSec',
                                                Number(event.target.value || 0) || 0,
                                            )
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Repos entre tours (sec, optionnel)">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={String(
                                            values.hiitConfig?.restBetweenRoundsSec || '',
                                        )}
                                        onChange={(event) =>
                                            setHiitField(
                                                'restBetweenRoundsSec',
                                                event.target.value
                                                    ? Number(event.target.value)
                                                    : undefined,
                                            )
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Exercices HIIT" asterisk>
                                    <Select<HiitExerciseOption, true>
                                        isMulti
                                        options={hiitExerciseOptions}
                                        value={selectedHiitExerciseOptions}
                                        placeholder="Rechercher et sélectionner les exercices HIIT..."
                                        closeMenuOnSelect={false}
                                        hideSelectedOptions={false}
                                        isSearchable
                                        noOptionsMessage={({ inputValue }) =>
                                            inputValue.trim()
                                                ? 'Aucun exercice trouvé'
                                                : 'Aucun exercice disponible'
                                        }
                                        onChange={(selected) =>
                                            setOrderedHiitExercises(
                                                (selected || []).map((option) =>
                                                    option.value.trim(),
                                                ),
                                            )
                                        }
                                    />
                                </FormItem>
                            </div>

                            {(values.hiitConfig?.exercises || []).length > 0 && (
                                <div className="mt-2">
                                    <p className="mb-2 text-sm font-semibold">
                                        Ordre des exercices HIIT
                                    </p>
                                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                                        Glisse-dépose pour réordonner, ou utilise ↑ / ↓.
                                    </p>
                                    <div className="space-y-2">
                                        {(values.hiitConfig?.exercises || []).map(
                                            (exerciseName, exerciseIndex) => (
                                                <div
                                                    key={`${exerciseName}_${exerciseIndex}`}
                                                    draggable
                                                    onDragStart={() =>
                                                        onHiitDragStart(exerciseIndex)
                                                    }
                                                    onDragOver={onHiitDragOver}
                                                    onDrop={() => onHiitDrop(exerciseIndex)}
                                                    onDragEnd={onHiitDragEnd}
                                                    className={`flex items-center justify-between gap-3 rounded-xl border bg-gray-50 px-3 py-2 dark:bg-gray-800/60 ${
                                                        draggedHiitIndex === exerciseIndex
                                                            ? 'border-blue-400 dark:border-blue-400'
                                                            : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                                                            {exerciseIndex + 1}
                                                        </span>
                                                        <span className="truncate text-sm font-medium">
                                                            {exerciseName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="xs"
                                                            disabled={exerciseIndex === 0}
                                                            onClick={() =>
                                                                moveHiitExercise(
                                                                    exerciseIndex,
                                                                    exerciseIndex - 1,
                                                                )
                                                            }
                                                        >
                                                            ↑
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            disabled={
                                                                exerciseIndex ===
                                                                (values.hiitConfig?.exercises
                                                                    ?.length || 1) -
                                                                    1
                                                            }
                                                            onClick={() =>
                                                                moveHiitExercise(
                                                                    exerciseIndex,
                                                                    exerciseIndex + 1,
                                                                )
                                                            }
                                                        >
                                                            ↓
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="twoTone"
                                                            icon={<HiOutlineTrash />}
                                                            onClick={() =>
                                                                removeHiitExercise(
                                                                    exerciseIndex,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {values.sessionType === 'running' && (
                        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                            <div className="grid gap-3 lg:grid-cols-2">
                                <FormItem label="Type de course">
                                    <Select<SelectOption, false>
                                        options={runningTypeSelectOptions}
                                        value={selectedRunTypeOption}
                                        isLoading={isRunningTypesLoading}
                                        isSearchable
                                        noOptionsMessage={({ inputValue }) =>
                                            inputValue.trim()
                                                ? 'Aucun type trouvé'
                                                : 'Aucun type disponible'
                                        }
                                        onChange={(option) =>
                                            setRunningField(
                                                'runType',
                                                option?.value || DEFAULT_RUNNING_TYPE_VALUE,
                                            )
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Distance cible (km, optionnel)">
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        value={String(values.runningConfig?.targetDistanceKm || '')}
                                        onChange={(event) =>
                                            setRunningField(
                                                'targetDistanceKm',
                                                event.target.value
                                                    ? Number(event.target.value)
                                                    : undefined,
                                            )
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Durée cible (min, optionnel)">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={String(values.runningConfig?.targetDurationMin || '')}
                                        onChange={(event) =>
                                            setRunningField(
                                                'targetDurationMin',
                                                event.target.value
                                                    ? Number(event.target.value)
                                                    : undefined,
                                            )
                                        }
                                    />
                                </FormItem>
                            </div>
                        </div>
                    )}
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
