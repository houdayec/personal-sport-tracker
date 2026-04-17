import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store'
import {
    createWorkoutTemplate,
    createWorkoutSessionFromTemplate,
    deleteWorkoutTemplate,
    duplicateWorkoutTemplate,
    listWorkoutTemplates,
    updateWorkoutTemplate,
} from '@/features/fitness/training/services/workoutSessionService'
import { listActiveExercises } from '@/features/fitness/training/services/exerciseService'
import type {
    WorkoutSession,
    WorkoutTemplate,
    WorkoutTemplateInput,
} from '@/features/fitness/training/types/workoutSession'
import type { Exercise } from '@/features/fitness/training/types/exercise'

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useWorkoutTemplates = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
    const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isMutating, setIsMutating] = useState(false)
    const [isStarting, setIsStarting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const assertUid = useCallback(() => {
        if (!uid) {
            throw new Error('Utilisateur non connecté.')
        }

        return uid
    }, [uid])

    const loadTemplates = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const currentUid = assertUid()
            const [items, exercises] = await Promise.all([
                listWorkoutTemplates(currentUid),
                listActiveExercises(currentUid),
            ])
            setTemplates(items)
            setExerciseOptions(exercises)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setTemplates([])
            setExerciseOptions([])
        } finally {
            setIsLoading(false)
        }
    }, [assertUid])

    useEffect(() => {
        loadTemplates()
    }, [loadTemplates])

    const runMutation = useCallback(
        async (operation: () => Promise<void>) => {
            setIsMutating(true)
            setError(null)

            try {
                await operation()
            } catch (mutationError) {
                setError(getErrorMessage(mutationError))
                throw mutationError
            } finally {
                setIsMutating(false)
            }
        },
        [],
    )

    const handleCreateTemplate = useCallback(
        async (input: WorkoutTemplateInput) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await createWorkoutTemplate(currentUid, input)
                const items = await listWorkoutTemplates(currentUid)
                setTemplates(items)
            })
        },
        [assertUid, runMutation],
    )

    const handleUpdateTemplate = useCallback(
        async (templateId: string, input: WorkoutTemplateInput) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await updateWorkoutTemplate(currentUid, templateId, input)
                const items = await listWorkoutTemplates(currentUid)
                setTemplates(items)
            })
        },
        [assertUid, runMutation],
    )

    const handleDeleteTemplate = useCallback(
        async (templateId: string) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await deleteWorkoutTemplate(currentUid, templateId)
                const items = await listWorkoutTemplates(currentUid)
                setTemplates(items)
            })
        },
        [assertUid, runMutation],
    )

    const handleDuplicateTemplate = useCallback(
        async (templateId: string) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await duplicateWorkoutTemplate(currentUid, templateId)
                const items = await listWorkoutTemplates(currentUid)
                setTemplates(items)
            })
        },
        [assertUid, runMutation],
    )

    const startSession = useCallback(
        async (templateId: string): Promise<WorkoutSession> => {
            setIsStarting(true)
            setError(null)

            try {
                const currentUid = assertUid()
                return await createWorkoutSessionFromTemplate(currentUid, templateId)
            } catch (startError) {
                setError(getErrorMessage(startError))
                throw startError
            } finally {
                setIsStarting(false)
            }
        },
        [assertUid],
    )

    return {
        templates,
        exerciseOptions,
        isLoading,
        isMutating,
        isStarting,
        error,
        loadTemplates,
        createTemplate: handleCreateTemplate,
        updateTemplate: handleUpdateTemplate,
        deleteTemplate: handleDeleteTemplate,
        duplicateTemplate: handleDuplicateTemplate,
        startSession,
    }
}

export default useWorkoutTemplates
