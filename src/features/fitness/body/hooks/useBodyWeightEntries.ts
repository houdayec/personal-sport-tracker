import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store'
import {
    createBodyWeightEntry,
    deleteBodyWeightEntry,
    listBodyWeightEntries,
    updateBodyWeightEntry,
} from '@/features/fitness/body/services/bodyWeightService'
import { logFitnessErrorDev } from '@/features/fitness/common/utils/debugError'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import type {
    BodyWeightEntry,
    BodyWeightEntryInput,
} from '@/features/fitness/body/types/bodyWeight'

const uidRequiredErrorMessage =
    'Utilisateur non connecté. Impossible d’accéder au suivi du poids.'

const getErrorMessage = (error: unknown): string => {
    logFitnessErrorDev('useBodyWeightEntries', error)

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useBodyWeightEntries = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [entries, setEntries] = useState<BodyWeightEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isMutating, setIsMutating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const assertUid = useCallback((): string => {
        if (!uid) {
            throw new Error(uidRequiredErrorMessage)
        }

        return uid
    }, [uid])

    const loadEntries = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const currentUid = assertUid()
            const data = await listBodyWeightEntries(currentUid)
            setEntries(data)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setEntries([])
        } finally {
            setIsLoading(false)
        }
    }, [assertUid])

    useEffect(() => {
        loadEntries()
    }, [loadEntries])

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

    const addEntry = useCallback(
        async (input: BodyWeightEntryInput) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await createBodyWeightEntry(currentUid, input)
                const data = await listBodyWeightEntries(currentUid)
                setEntries(data)
                showFitnessSuccessToast('Entrée de poids ajoutée.')
            })
        },
        [assertUid, runMutation],
    )

    const editEntry = useCallback(
        async (entryId: string, input: BodyWeightEntryInput) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await updateBodyWeightEntry(currentUid, entryId, input)
                const data = await listBodyWeightEntries(currentUid)
                setEntries(data)
                showFitnessSuccessToast('Entrée de poids mise à jour.')
            })
        },
        [assertUid, runMutation],
    )

    const removeEntry = useCallback(
        async (entryId: string) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await deleteBodyWeightEntry(currentUid, entryId)
                const data = await listBodyWeightEntries(currentUid)
                setEntries(data)
                showFitnessSuccessToast('Entrée de poids supprimée.')
            })
        },
        [assertUid, runMutation],
    )

    return {
        entries,
        isLoading,
        isMutating,
        error,
        loadEntries,
        addEntry,
        editEntry,
        removeEntry,
    }
}

export default useBodyWeightEntries
