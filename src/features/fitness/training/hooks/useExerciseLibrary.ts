import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store'
import {
    archiveExercise,
    createExercise,
    listActiveExercises,
    listArchivedExercises,
    unarchiveExercise,
    updateExercise,
} from '@/features/fitness/training/services/exerciseService'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import type { Exercise, ExerciseInput } from '@/features/fitness/training/types/exercise'

const uidRequiredErrorMessage =
    'Utilisateur non connecté. Impossible d’accéder à la bibliothèque d’exercices.'
const globalExerciseMutationError =
    'Les exercices globaux sont en lecture seule.'

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useExerciseLibrary = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [activeExercises, setActiveExercises] = useState<Exercise[]>([])
    const [archivedExercises, setArchivedExercises] = useState<Exercise[]>([])
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [isArchivedLoading, setIsArchivedLoading] = useState(false)
    const [isMutating, setIsMutating] = useState(false)
    const [isArchivedLoaded, setIsArchivedLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const assertUid = useCallback((): string => {
        if (!uid) {
            throw new Error(uidRequiredErrorMessage)
        }

        return uid
    }, [uid])

    const refreshActiveExercises = useCallback(async () => {
        const currentUid = assertUid()
        const list = await listActiveExercises(currentUid)
        setActiveExercises(list)
    }, [assertUid])

    const refreshArchivedExercises = useCallback(async () => {
        const currentUid = assertUid()
        const list = await listArchivedExercises(currentUid)
        setArchivedExercises(list)
        setIsArchivedLoaded(true)
    }, [assertUid])

    const loadInitialData = useCallback(async () => {
        setIsInitialLoading(true)
        setError(null)

        try {
            await refreshActiveExercises()
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setActiveExercises([])
        } finally {
            setIsInitialLoading(false)
        }
    }, [refreshActiveExercises])

    const loadArchivedData = useCallback(async () => {
        setIsArchivedLoading(true)
        setError(null)

        try {
            await refreshArchivedExercises()
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setArchivedExercises([])
        } finally {
            setIsArchivedLoading(false)
        }
    }, [refreshArchivedExercises])

    const runMutation = useCallback(
        async (operation: () => Promise<void>) => {
            setIsMutating(true)
            setError(null)

            try {
                await operation()
            } catch (mutationError) {
                showFitnessErrorToast(getErrorMessage(mutationError))
                throw mutationError
            } finally {
                setIsMutating(false)
            }
        },
        [],
    )

    const handleCreateExercise = useCallback(
        async (input: ExerciseInput) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await createExercise(currentUid, input)
                await refreshActiveExercises()
                showFitnessSuccessToast('Exercice ajouté à ta bibliothèque.')
            })
        },
        [assertUid, refreshActiveExercises, runMutation],
    )

    const handleUpdateExercise = useCallback(
        async (exercise: Exercise, input: ExerciseInput) => {
            await runMutation(async () => {
                if (exercise.exerciseSource !== 'user') {
                    throw new Error(globalExerciseMutationError)
                }
                const currentUid = assertUid()
                await updateExercise(currentUid, exercise.id, input)
                await refreshActiveExercises()

                if (isArchivedLoaded) {
                    await refreshArchivedExercises()
                }
                showFitnessSuccessToast('Exercice mis à jour.')
            })
        },
        [
            assertUid,
            isArchivedLoaded,
            refreshActiveExercises,
            refreshArchivedExercises,
            runMutation,
        ],
    )

    const handleArchiveExercise = useCallback(
        async (exercise: Exercise) => {
            await runMutation(async () => {
                if (exercise.exerciseSource !== 'user') {
                    throw new Error(globalExerciseMutationError)
                }
                const currentUid = assertUid()
                await archiveExercise(currentUid, exercise.id)
                await refreshActiveExercises()

                if (isArchivedLoaded) {
                    await refreshArchivedExercises()
                }
                showFitnessSuccessToast('Exercice archivé.')
            })
        },
        [
            assertUid,
            isArchivedLoaded,
            refreshActiveExercises,
            refreshArchivedExercises,
            runMutation,
        ],
    )

    const handleUnarchiveExercise = useCallback(
        async (exercise: Exercise) => {
            await runMutation(async () => {
                if (exercise.exerciseSource !== 'user') {
                    throw new Error(globalExerciseMutationError)
                }
                const currentUid = assertUid()
                await unarchiveExercise(currentUid, exercise.id)
                await refreshActiveExercises()

                if (isArchivedLoaded) {
                    await refreshArchivedExercises()
                }
                showFitnessSuccessToast('Exercice désarchivé.')
            })
        },
        [
            assertUid,
            isArchivedLoaded,
            refreshActiveExercises,
            refreshArchivedExercises,
            runMutation,
        ],
    )

    useEffect(() => {
        loadInitialData()
    }, [loadInitialData])

    return {
        activeExercises,
        archivedExercises,
        isInitialLoading,
        isArchivedLoading,
        isMutating,
        isArchivedLoaded,
        error,
        loadInitialData,
        loadArchivedData,
        createExercise: handleCreateExercise,
        updateExercise: handleUpdateExercise,
        archiveExercise: handleArchiveExercise,
        unarchiveExercise: handleUnarchiveExercise,
    }
}

export default useExerciseLibrary
