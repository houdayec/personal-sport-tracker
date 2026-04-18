import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    Alert,
    Button,
    Card,
    Spinner,
    Tag,
} from '@/components/ui'
import WorkoutTemplateFormDialog from '@/features/fitness/training/components/WorkoutTemplateFormDialog'
import useWorkoutTemplates from '@/features/fitness/training/hooks/useWorkoutTemplates'
import { FITNESS_ROUTES } from '@/features/fitness/constants/routes'
import type {
    SessionType,
    WorkoutTemplate,
    WorkoutTemplateInput,
} from '@/features/fitness/training/types/workoutSession'
import { formatRunningTypeLabel } from '@/features/fitness/training/utils/runningType'
import {
    HiOutlineDocumentAdd,
    HiOutlineDuplicate,
    HiOutlinePencil,
    HiOutlinePlay,
    HiOutlineRefresh,
    HiOutlineTrash,
} from 'react-icons/hi'

type TemplateFormMode = 'create' | 'edit'

const DEFAULT_TEMPLATE_INPUT: WorkoutTemplateInput = {
    name: '',
    tags: [],
    sessionType: 'strength',
    description: '',
    isArchived: false,
    exercises: [
        {
            exerciseSource: 'user',
            exerciseId: null,
            exerciseSnapshot: {
                name: 'Exercice 1',
                muscleGroup: '',
                equipment: '',
            },
            name: 'Exercice 1',
            muscleGroup: '',
            equipment: '',
            plannedSets: [
                {
                    setNumber: 1,
                    targetReps: '10',
                    targetWeight: '',
                },
                {
                    setNumber: 2,
                    targetReps: '10',
                    targetWeight: '',
                },
                {
                    setNumber: 3,
                    targetReps: '10',
                    targetWeight: '',
                },
            ],
        },
    ],
    strengthConfig: undefined,
    hiitConfig: undefined,
    runningConfig: undefined,
}

const cloneTemplateAsInput = (template: WorkoutTemplate): WorkoutTemplateInput => {
    const strengthExercises =
        template.strengthConfig?.exercises || template.exercises || []

    return {
        name: template.name,
        tags: template.tags || [],
        sessionType: template.sessionType || 'strength',
        description: template.description || '',
        isArchived: Boolean(template.isArchived),
        exercises: strengthExercises.map((exercise) => ({
            exerciseSource: exercise.exerciseSource || 'user',
            exerciseId: exercise.exerciseId || null,
            exerciseSnapshot: exercise.exerciseSnapshot || {
                name: exercise.name,
                muscleGroup: exercise.muscleGroup || '',
                equipment: exercise.equipment || '',
            },
            name: exercise.name,
            muscleGroup: exercise.muscleGroup || '',
            equipment: exercise.equipment || '',
            plannedSets: exercise.plannedSets.map((set, index) => ({
                setNumber: index + 1,
                targetReps: set.targetReps || '',
                targetWeight: set.targetWeight || '',
            })),
        })),
        strengthConfig: {
            exercises: strengthExercises.map((exercise) => ({
                exerciseSource: exercise.exerciseSource || 'user',
                exerciseId: exercise.exerciseId || null,
                exerciseSnapshot: exercise.exerciseSnapshot || {
                    name: exercise.name,
                    muscleGroup: exercise.muscleGroup || '',
                    equipment: exercise.equipment || '',
                },
                name: exercise.name,
                muscleGroup: exercise.muscleGroup || '',
                equipment: exercise.equipment || '',
                plannedSets: exercise.plannedSets.map((set, index) => ({
                    setNumber: index + 1,
                    targetReps: set.targetReps || '',
                    targetWeight: set.targetWeight || '',
                })),
            })),
        },
        hiitConfig: template.hiitConfig,
        runningConfig: template.runningConfig,
    }
}

const sessionTypeLabel: Record<SessionType, string> = {
    strength: 'Force',
    hiit: 'HIIT',
    running: 'Course',
}

const getTemplateDate = (template: WorkoutTemplate) => {
    const date = template.updatedAt ?? template.createdAt

    if (!date) {
        return 'Date indisponible'
    }

    return dayjs(date.toDate()).format('DD/MM/YYYY HH:mm')
}

const WorkoutTemplatesPage = () => {
    const navigate = useNavigate()

    const {
        templates,
        exerciseOptions,
        isLoading,
        isMutating,
        isStarting,
        error,
        loadTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        duplicateTemplate,
        startSession,
    } = useWorkoutTemplates()

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [formMode, setFormMode] = useState<TemplateFormMode>('create')
    const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
    const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null)
    const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null)

    const formInitialValues = useMemo<WorkoutTemplateInput>(() => {
        if (!selectedTemplate) {
            return DEFAULT_TEMPLATE_INPUT
        }

        return cloneTemplateAsInput(selectedTemplate)
    }, [selectedTemplate])

    const openCreateDialog = () => {
        setSelectedTemplate(null)
        setFormMode('create')
        setIsFormOpen(true)
    }

    const openEditDialog = (template: WorkoutTemplate) => {
        setSelectedTemplate(template)
        setFormMode('edit')
        setIsFormOpen(true)
    }

    const closeFormDialog = () => {
        setIsFormOpen(false)
    }

    const handleSubmitTemplate = async (values: WorkoutTemplateInput) => {
        if (formMode === 'create') {
            await createTemplate(values)
            closeFormDialog()
            return
        }

        if (!selectedTemplate) {
            throw new Error('Template introuvable pour la modification.')
        }

        await updateTemplate(selectedTemplate.id, values)
        closeFormDialog()
    }

    const handleStartSession = async (templateId: string) => {
        setStartingTemplateId(templateId)
        try {
            await startSession(templateId)
            navigate(FITNESS_ROUTES.trainingToday)
        } catch {
            // Error already handled in hook state.
        } finally {
            setStartingTemplateId((currentId) =>
                currentId === templateId ? null : currentId,
            )
        }
    }

    const handleDuplicateTemplate = async (templateId: string) => {
        try {
            await duplicateTemplate(templateId)
        } catch {
            // Error already handled in hook state.
        }
    }

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) {
            return
        }

        try {
            await deleteTemplate(templateToDelete.id)
            setTemplateToDelete(null)
        } catch {
            // Error already handled in hook state.
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Entraînement
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Templates de séances</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                        Prépare tes séances à l’avance et lance-les rapidement quand tu
                        t’entraînes.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        icon={<HiOutlineRefresh />}
                        onClick={loadTemplates}
                        disabled={isLoading || isMutating || isStarting}
                    >
                        Rafraîchir
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        icon={<HiOutlineDocumentAdd />}
                        onClick={openCreateDialog}
                    >
                        Nouveau template
                    </Button>
                </div>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                {isLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucun template pour le moment.
                        </p>
                        <Button
                            className="mt-4"
                            size="sm"
                            variant="solid"
                            onClick={openCreateDialog}
                        >
                            Créer le premier template
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                            >
                                <div className="flex h-full flex-col justify-between gap-4">
                                    <div>
                                        <p className="text-base font-semibold">{template.name}</p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Mise à jour: {getTemplateDate(template)}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                                                {sessionTypeLabel[template.sessionType || 'strength']}
                                            </Tag>
                                            <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                {template.sessionType === 'strength'
                                                    ? `${(template.strengthConfig?.exercises || template.exercises || []).length} exercice${(template.strengthConfig?.exercises || template.exercises || []).length > 1 ? 's' : ''}`
                                                    : template.sessionType === 'hiit'
                                                      ? `${template.hiitConfig?.rounds || 0} tours`
                                                      : formatRunningTypeLabel(template.runningConfig?.runType)}
                                            </Tag>
                                            {template.tags.map((tag) => (
                                                <Tag
                                                    key={`${template.id}-${tag}`}
                                                    className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                                                >
                                                    #{tag}
                                                </Tag>
                                            ))}
                                        </div>
                                        {template.description && (
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {template.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            size="xs"
                                            variant="solid"
                                            icon={<HiOutlinePlay />}
                                            onClick={() => handleStartSession(template.id)}
                                            loading={
                                                isStarting &&
                                                startingTemplateId === template.id
                                            }
                                            disabled={
                                                isStarting &&
                                                startingTemplateId !== template.id
                                            }
                                        >
                                            Lancer
                                        </Button>
                                        <Button
                                            size="xs"
                                            icon={<HiOutlinePencil />}
                                            onClick={() => openEditDialog(template)}
                                            disabled={isMutating || isStarting}
                                        >
                                            Modifier
                                        </Button>
                                        <Button
                                            size="xs"
                                            icon={<HiOutlineDuplicate />}
                                            onClick={() =>
                                                handleDuplicateTemplate(template.id)
                                            }
                                            disabled={isMutating || isStarting}
                                        >
                                            Dupliquer
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="twoTone"
                                            icon={<HiOutlineTrash />}
                                            onClick={() => setTemplateToDelete(template)}
                                            disabled={isMutating || isStarting}
                                        >
                                            Supprimer
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <WorkoutTemplateFormDialog
                isOpen={isFormOpen}
                mode={formMode}
                isSubmitting={isMutating}
                initialValues={formInitialValues}
                exerciseOptions={exerciseOptions}
                onClose={closeFormDialog}
                onSubmit={handleSubmitTemplate}
            />

            <ConfirmDialog
                isOpen={Boolean(templateToDelete)}
                type="danger"
                title="Supprimer ce template ?"
                confirmText="Supprimer"
                cancelText="Annuler"
                onClose={() => setTemplateToDelete(null)}
                onRequestClose={() => setTemplateToDelete(null)}
                onCancel={() => setTemplateToDelete(null)}
                onConfirm={handleDeleteTemplate}
            >
                <p>
                    Cette action est irréversible. Le template sera supprimé de la
                    bibliothèque.
                </p>
            </ConfirmDialog>
        </div>
    )
}

export default WorkoutTemplatesPage
