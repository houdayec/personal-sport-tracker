import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store'
import {
    createBodyMeasurementEntry,
    deleteBodyMeasurementEntry,
    listBodyMeasurementEntries,
    updateBodyMeasurementEntry,
} from '@/features/fitness/body/services/bodyMeasurementService'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import type {
    BodyMeasurementEntry,
    BodyMeasurementEntryInput,
} from '@/features/fitness/body/types/bodyMeasurement'

const uidRequiredErrorMessage =
    'Utilisateur non connecté. Impossible d’accéder au suivi des mensurations.'

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useBodyMeasurementEntries = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [entries, setEntries] = useState<BodyMeasurementEntry[]>([])
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
            const data = await listBodyMeasurementEntries(currentUid)
            setEntries(data)
        } catch (loadError) {
            setEntries([])
            setError(getErrorMessage(loadError))
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
        async (input: BodyMeasurementEntryInput) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await createBodyMeasurementEntry(currentUid, input)
                const data = await listBodyMeasurementEntries(currentUid)
                setEntries(data)
                showFitnessSuccessToast('Snapshot de mensurations enregistré.')
            })
        },
        [assertUid, runMutation],
    )

    const editEntry = useCallback(
        async (entryId: string, input: BodyMeasurementEntryInput) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await updateBodyMeasurementEntry(currentUid, entryId, input)
                const data = await listBodyMeasurementEntries(currentUid)
                setEntries(data)
                showFitnessSuccessToast('Snapshot de mensurations mis à jour.')
            })
        },
        [assertUid, runMutation],
    )

    const removeEntry = useCallback(
        async (entryId: string) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await deleteBodyMeasurementEntry(currentUid, entryId)
                const data = await listBodyMeasurementEntries(currentUid)
                setEntries(data)
                showFitnessSuccessToast('Snapshot de mensurations supprimé.')
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

export default useBodyMeasurementEntries
