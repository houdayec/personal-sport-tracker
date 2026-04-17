import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    Alert,
    Button,
    Card,
    Input,
    Spinner,
    Tag,
} from '@/components/ui'
import ExerciseFormDialog from '@/features/fitness/training/components/ExerciseFormDialog'
import useExerciseLibrary from '@/features/fitness/training/hooks/useExerciseLibrary'
import type { Exercise, ExerciseInput } from '@/features/fitness/training/types/exercise'
import {
    HiOutlineBan,
    HiOutlineCheckCircle,
    HiOutlineDocumentAdd,
    HiOutlinePencil,
    HiOutlineRefresh,
    HiOutlineSearch,
} from 'react-icons/hi'

const EMPTY_EXERCISE_INPUT: ExerciseInput = {
    name: '',
    muscleGroup: '',
    equipment: '',
}

type ExerciseFormMode = 'create' | 'edit'

const formatExerciseDate = (exercise: Exercise) => {
    const date = exercise.updatedAt ?? exercise.createdAt

    if (!date) {
        return 'Date indisponible'
    }

    return dayjs(date.toDate()).format('DD/MM/YYYY HH:mm')
}

const matchExerciseSearch = (exercise: Exercise, term: string) => {
    if (!term) {
        return true
    }

    const normalized = term.toLowerCase()

    return [exercise.name, exercise.muscleGroup, exercise.equipment]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
}

const getExerciseKey = (exercise: Exercise) => {
    return `${exercise.exerciseSource}:${exercise.id}`
}

const ExerciseLibraryPage = () => {
    const {
        activeExercises,
        archivedExercises,
        isInitialLoading,
        isArchivedLoading,
        isMutating,
        isArchivedLoaded,
        error,
        loadInitialData,
        loadArchivedData,
        createExercise,
        updateExercise,
        archiveExercise,
        unarchiveExercise,
    } = useExerciseLibrary()

    const [searchTerm, setSearchTerm] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [formMode, setFormMode] = useState<ExerciseFormMode>('create')
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
    const [exerciseToArchive, setExerciseToArchive] = useState<Exercise | null>(
        null,
    )

    const filteredActiveExercises = useMemo(() => {
        return activeExercises.filter((exercise) =>
            matchExerciseSearch(exercise, searchTerm.trim()),
        )
    }, [activeExercises, searchTerm])

    const filteredArchivedExercises = useMemo(() => {
        return archivedExercises.filter((exercise) =>
            matchExerciseSearch(exercise, searchTerm.trim()),
        )
    }, [archivedExercises, searchTerm])

    const formInitialValues = useMemo<ExerciseInput>(() => {
        if (!selectedExercise) {
            return EMPTY_EXERCISE_INPUT
        }

        return {
            name: selectedExercise.name,
            muscleGroup: selectedExercise.muscleGroup,
            equipment: selectedExercise.equipment,
        }
    }, [selectedExercise])

    useEffect(() => {
        if (showArchived && !isArchivedLoaded && !isArchivedLoading) {
            loadArchivedData()
        }
    }, [showArchived, isArchivedLoaded, isArchivedLoading, loadArchivedData])

    const openCreateDialog = () => {
        setFormMode('create')
        setSelectedExercise(null)
        setIsFormOpen(true)
    }

    const openEditDialog = (exercise: Exercise) => {
        setFormMode('edit')
        setSelectedExercise(exercise)
        setIsFormOpen(true)
    }

    const closeFormDialog = () => {
        setIsFormOpen(false)
    }

    const handleSubmitExerciseForm = async (values: ExerciseInput) => {
        if (formMode === 'create') {
            await createExercise(values)
            closeFormDialog()
            return
        }

        if (!selectedExercise) {
            throw new Error('Exercice introuvable pour la modification.')
        }

        await updateExercise(selectedExercise, values)
        closeFormDialog()
    }

    const handleArchiveExercise = async (exercise: Exercise) => {
        try {
            await archiveExercise(exercise)
        } catch {
            // Error already managed in hook state.
        }
    }

    const handleConfirmArchiveExercise = async () => {
        if (!exerciseToArchive) {
            return
        }

        await handleArchiveExercise(exerciseToArchive)
        setExerciseToArchive(null)
    }

    const handleUnarchiveExercise = async (exercise: Exercise) => {
        try {
            await unarchiveExercise(exercise)
        } catch {
            // Error already managed in hook state.
        }
    }

    const renderList = (
        exercises: Exercise[],
        options?: { archived?: boolean; emptyMessage?: string },
    ) => {
        const { archived = false, emptyMessage } = options || {}

        if (exercises.length === 0) {
            return (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                    {emptyMessage || 'Aucun exercice trouvé pour ce filtre.'}
                </div>
            )
        }

        return (
            <div className="space-y-3">
                {exercises.map((exercise) => (
                    <div
                        key={getExerciseKey(exercise)}
                        className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-base font-semibold">{exercise.name}</p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Dernière mise à jour: {formatExerciseDate(exercise)}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                                        {exercise.muscleGroup}
                                    </Tag>
                                    <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                        {exercise.equipment}
                                    </Tag>
                                    <Tag
                                        className={
                                            exercise.exerciseSource === 'global'
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
                                        }
                                    >
                                        {exercise.exerciseSource === 'global'
                                            ? 'Global'
                                            : 'Custom'}
                                    </Tag>
                                    {exercise.isArchived && (
                                        <Tag className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100">
                                            Archivé
                                        </Tag>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {exercise.exerciseSource === 'user' && (
                                    <>
                                        <Button
                                            size="xs"
                                            icon={<HiOutlinePencil />}
                                            onClick={() => openEditDialog(exercise)}
                                            disabled={isMutating}
                                        >
                                            Modifier
                                        </Button>
                                        {archived ? (
                                            <Button
                                                size="xs"
                                                variant="twoTone"
                                                icon={<HiOutlineCheckCircle />}
                                                onClick={() =>
                                                    handleUnarchiveExercise(exercise)
                                                }
                                                disabled={isMutating}
                                            >
                                                Désarchiver
                                            </Button>
                                        ) : (
                                            <Button
                                                size="xs"
                                                variant="twoTone"
                                                icon={<HiOutlineBan />}
                                                onClick={() =>
                                                    setExerciseToArchive(exercise)
                                                }
                                                disabled={isMutating}
                                            >
                                                Archiver
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                    Entraînement
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Bibliothèque d’exercices</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Bibliothèque fusionnée avec exercices partagés
                    <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                        global_exercises
                    </code>
                    et exercices personnalisés
                    <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                        users/{'{uid}'}/exercises
                    </code>
                    .
                </p>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="w-full lg:max-w-md">
                        <Input
                            value={searchTerm}
                            placeholder="Rechercher un exercice"
                            prefix={<HiOutlineSearch className="text-lg" />}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            icon={<HiOutlineRefresh />}
                            onClick={loadInitialData}
                            disabled={isInitialLoading || isMutating}
                        >
                            Rafraîchir
                        </Button>
                        <Button
                            size="sm"
                            variant={showArchived ? 'solid' : 'default'}
                            onClick={() => setShowArchived((value) => !value)}
                        >
                            {showArchived
                                ? 'Masquer archivés'
                                : 'Afficher archivés'}
                        </Button>
                        <Button
                            size="sm"
                            variant="solid"
                            icon={<HiOutlineDocumentAdd />}
                            onClick={openCreateDialog}
                        >
                            Nouvel exercice
                        </Button>
                    </div>
                </div>
            </Card>

            <Card header="Exercices actifs">
                {isInitialLoading ? (
                    <div className="flex min-h-[160px] items-center justify-center">
                        <Spinner size={32} />
                    </div>
                ) : activeExercises.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucun exercice actif pour le moment.
                        </p>
                        <Button
                            className="mt-4"
                            size="sm"
                            variant="solid"
                            onClick={openCreateDialog}
                        >
                            Créer le premier exercice
                        </Button>
                    </div>
                ) : (
                    renderList(filteredActiveExercises, {
                        emptyMessage:
                            'Aucun exercice actif ne correspond à la recherche.',
                    })
                )}
            </Card>

            {showArchived && (
                <Card header="Exercices archivés">
                    {isArchivedLoading ? (
                        <div className="flex min-h-[120px] items-center justify-center">
                            <Spinner size={28} />
                        </div>
                    ) : (
                        renderList(filteredArchivedExercises, {
                            archived: true,
                            emptyMessage:
                                'Aucun exercice archivé ne correspond à la recherche.',
                        })
                    )}
                </Card>
            )}

            <ExerciseFormDialog
                isOpen={isFormOpen}
                mode={formMode}
                isSubmitting={isMutating}
                initialValues={formInitialValues}
                onClose={closeFormDialog}
                onSubmit={handleSubmitExerciseForm}
            />

            <ConfirmDialog
                isOpen={Boolean(exerciseToArchive)}
                type="warning"
                title="Archiver cet exercice ?"
                confirmText="Archiver"
                cancelText="Annuler"
                onClose={() => setExerciseToArchive(null)}
                onRequestClose={() => setExerciseToArchive(null)}
                onCancel={() => setExerciseToArchive(null)}
                onConfirm={handleConfirmArchiveExercise}
            >
                <p>
                    {exerciseToArchive
                        ? `L’exercice "${exerciseToArchive.name}" sera masqué des actifs et déplacé dans la section archivés.`
                        : 'Cet exercice sera déplacé dans la section archivés.'}
                </p>
            </ConfirmDialog>
        </div>
    )
}

export default ExerciseLibraryPage
