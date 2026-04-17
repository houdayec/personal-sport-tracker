import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
    Alert,
    Button,
    Card,
    Spinner,
    Tag,
} from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import WorkoutExerciseDetailDialog from '@/features/fitness/training/components/WorkoutExerciseDetailDialog'
import useWorkoutTodaySession from '@/features/fitness/training/hooks/useWorkoutTodaySession'
import type {
    PlannedWorkoutExercise,
    PerformedExerciseStatus,
} from '@/features/fitness/training/types/workoutSession'
import {
    HiOutlinePlay,
    HiOutlineRefresh,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineClipboardList,
    HiOutlinePencil,
} from 'react-icons/hi'

const statusToTagClass: Record<PerformedExerciseStatus, string> = {
    not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100',
    completed:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
}

const statusToLabel: Record<PerformedExerciseStatus, string> = {
    not_started: 'Non commencé',
    in_progress: 'En cours',
    completed: 'Terminé',
}

const WorkoutTodayPage = () => {
    const {
        templates,
        activeSession,
        completedExerciseCount,
        isLoading,
        isStarting,
        isSavingExercise,
        isFinishingSession,
        error,
        successMessage,
        loadData,
        startSessionFromTemplate,
        savePerformedExercise,
        completeExercise,
        finishSession,
    } = useWorkoutTodaySession()

    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
    const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false)

    const selectedPlannedExercise = useMemo(() => {
        if (!activeSession || !selectedExerciseId) {
            return null
        }

        return (
            activeSession.plannedExercises.find(
                (exercise) => exercise.plannedExerciseId === selectedExerciseId,
            ) || null
        )
    }, [activeSession, selectedExerciseId])

    const selectedPerformedExercise = useMemo(() => {
        if (!activeSession || !selectedExerciseId) {
            return null
        }

        return activeSession.performedExercises[selectedExerciseId] || null
    }, [activeSession, selectedExerciseId])

    const totalExercises = activeSession?.plannedExercises.length || 0

    const openExercise = (exercise: PlannedWorkoutExercise) => {
        setSelectedExerciseId(exercise.plannedExerciseId)
    }

    const closeExerciseDialog = () => {
        setSelectedExerciseId(null)
    }

    const handleStartTemplate = async (templateId: string) => {
        try {
            await startSessionFromTemplate(templateId)
        } catch {
            // Error managed in hook state.
        }
    }

    const handleFinishSession = async () => {
        try {
            await finishSession()
            setIsFinishConfirmOpen(false)
            setSelectedExerciseId(null)
        } catch {
            // Error managed in hook state.
        }
    }

    const renderTemplateLauncher = () => {
        if (templates.length === 0) {
            return (
                <Card>
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucun template disponible pour démarrer une séance.
                        </p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Ajoute au moins un template dans
                            <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                                users/{'{uid}'}/workout_templates
                            </code>
                            .
                        </p>
                    </div>
                </Card>
            )
        }

        return (
            <div className="grid gap-4 lg:grid-cols-2">
                {templates.map((template) => (
                    <Card key={template.id}>
                        <div className="flex h-full flex-col justify-between gap-4">
                            <div>
                                <h5>{template.name}</h5>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    {template.exercises.length} exercice
                                    {template.exercises.length > 1 ? 's' : ''} planifié
                                    {template.exercises.length > 1 ? 's' : ''}.
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    variant="solid"
                                    icon={<HiOutlinePlay />}
                                    loading={isStarting}
                                    onClick={() => handleStartTemplate(template.id)}
                                >
                                    Lancer ce template
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )
    }

    const renderActiveSession = () => {
        if (!activeSession) {
            return null
        }

        return (
            <div className="space-y-4">
                <Card>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h5>Séance en cours</h5>
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
                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                    {completedExerciseCount}/{totalExercises} terminé
                                    {totalExercises > 1 ? 's' : ''}
                                </Tag>
                                {(activeSession.sourceTemplate?.name ||
                                    activeSession.templateName) && (
                                    <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                                        Template:{' '}
                                        {activeSession.sourceTemplate?.name ||
                                            activeSession.templateName}
                                    </Tag>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                icon={<HiOutlineRefresh />}
                                onClick={loadData}
                                disabled={isSavingExercise || isFinishingSession}
                            >
                                Rafraîchir
                            </Button>
                            <Button
                                size="sm"
                                variant="solid"
                                icon={<HiOutlineCheckCircle />}
                                loading={isFinishingSession}
                                onClick={() => setIsFinishConfirmOpen(true)}
                            >
                                Terminer la séance
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card header="Exercices de la séance">
                    <div className="space-y-3">
                        {activeSession.plannedExercises.map((exercise) => {
                            const performed =
                                activeSession.performedExercises[exercise.plannedExerciseId]
                            const status: PerformedExerciseStatus =
                                performed?.status || 'not_started'

                            return (
                                <div
                                    key={exercise.plannedExerciseId}
                                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{exercise.name}</p>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Ordre template: {exercise.orderIndex + 1}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Tag className={statusToTagClass[status]}>
                                                    {statusToLabel[status]}
                                                </Tag>
                                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    {exercise.muscleGroup || 'Muscle non défini'}
                                                </Tag>
                                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    {exercise.equipment || 'Matériel non défini'}
                                                </Tag>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                size="xs"
                                                icon={<HiOutlinePencil />}
                                                onClick={() => openExercise(exercise)}
                                            >
                                                Ouvrir
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Entraînement
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Séance du jour</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Démarre ou reprends ta séance, puis note ce que tu fais
                    réellement, à ton rythme.
                </p>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}
            {successMessage && (
                <Alert type="success" showIcon>
                    {successMessage}
                </Alert>
            )}

            {isLoading ? (
                <Card>
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                </Card>
            ) : activeSession ? (
                renderActiveSession()
            ) : (
                <>
                    <Card>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <HiOutlineClipboardList className="text-xl text-gray-500" />
                                <p className="font-semibold">Démarrer depuis un template</p>
                            </div>
                            <Button
                                size="sm"
                                icon={<HiOutlineRefresh />}
                                onClick={loadData}
                                disabled={isStarting}
                            >
                                Rafraîchir
                            </Button>
                        </div>
                    </Card>
                    {renderTemplateLauncher()}
                </>
            )}

            <WorkoutExerciseDetailDialog
                isOpen={Boolean(selectedExerciseId && selectedPlannedExercise)}
                plannedExercise={selectedPlannedExercise}
                performedExercise={selectedPerformedExercise}
                isSaving={isSavingExercise}
                onClose={closeExerciseDialog}
                onSave={savePerformedExercise}
                onComplete={completeExercise}
            />

            <ConfirmDialog
                isOpen={isFinishConfirmOpen}
                type="warning"
                title="Terminer la séance"
                confirmText="Terminer"
                cancelText="Annuler"
                onClose={() => setIsFinishConfirmOpen(false)}
                onRequestClose={() => setIsFinishConfirmOpen(false)}
                onCancel={() => setIsFinishConfirmOpen(false)}
                onConfirm={handleFinishSession}
            >
                <p>
                    Cette action clôture la séance actuelle et la place dans
                    l’historique. Tu pourras toujours la consulter ensuite.
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <HiOutlineClock />
                    Progression actuelle: {completedExerciseCount}/{totalExercises} exercice
                    {totalExercises > 1 ? 's' : ''} terminé
                    {totalExercises > 1 ? 's' : ''}.
                </p>
            </ConfirmDialog>
        </div>
    )
}

export default WorkoutTodayPage
