import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store'
import {
    createBodyCheckin,
    deleteBodyCheckin,
    deleteBodyCheckinPhoto,
    getBodyCheckins,
    updateBodyCheckin,
    uploadBodyCheckinPhoto,
} from '@/features/fitness/body/services/bodyCheckinService'
import { logFitnessErrorDev } from '@/features/fitness/common/utils/debugError'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import type {
    BodyCheckin,
    BodyCheckinInput,
    BodyCheckinPhoto,
    BodyCheckinPhotoUploadInput,
} from '@/features/fitness/body/types/bodyCheckin'

const uidRequiredErrorMessage =
    'Utilisateur non connecté. Impossible d’accéder aux body check-ins.'

const getErrorMessage = (error: unknown): string => {
    logFitnessErrorDev('useBodyCheckins', error)

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

interface EditBodyCheckinPayload {
    checkinId: string
    input: BodyCheckinInput
    existingPhotos: BodyCheckinPhoto[]
    removedPhotoPaths: string[]
    newPhotos: BodyCheckinPhotoUploadInput[]
}

const useBodyCheckins = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)

    const [checkins, setCheckins] = useState<BodyCheckin[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isMutating, setIsMutating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const assertUid = useCallback((): string => {
        if (!uid) {
            throw new Error(uidRequiredErrorMessage)
        }

        return uid
    }, [uid])

    const loadCheckins = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const currentUid = assertUid()
            const items = await getBodyCheckins(currentUid)
            setCheckins(items)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setCheckins([])
        } finally {
            setIsLoading(false)
        }
    }, [assertUid])

    useEffect(() => {
        loadCheckins()
    }, [loadCheckins])

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

    const addCheckin = useCallback(
        async (
            input: BodyCheckinInput,
            photosToUpload: BodyCheckinPhotoUploadInput[],
        ) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                const checkinId = await createBodyCheckin(currentUid, {
                    ...input,
                    photos: [],
                })

                for (const photo of photosToUpload) {
                    await uploadBodyCheckinPhoto(
                        currentUid,
                        checkinId,
                        photo.type,
                        photo.file,
                    )
                }

                const items = await getBodyCheckins(currentUid)
                setCheckins(items)
                showFitnessSuccessToast('Body check-in enregistré.')
            })
        },
        [assertUid, runMutation],
    )

    const editCheckin = useCallback(
        async (payload: EditBodyCheckinPayload) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                const newPhotoTypes = new Set(payload.newPhotos.map((photo) => photo.type))
                const remainingPhotos = payload.existingPhotos.filter((photo) => {
                    if (!photo.path) {
                        return !newPhotoTypes.has(photo.type)
                    }
                    if (payload.removedPhotoPaths.includes(photo.path)) {
                        return false
                    }
                    return !newPhotoTypes.has(photo.type)
                })

                await updateBodyCheckin(currentUid, payload.checkinId, {
                    ...payload.input,
                    photos: remainingPhotos,
                })

                for (const photoPath of payload.removedPhotoPaths) {
                    await deleteBodyCheckinPhoto(currentUid, payload.checkinId, photoPath)
                }

                for (const photo of payload.newPhotos) {
                    await uploadBodyCheckinPhoto(
                        currentUid,
                        payload.checkinId,
                        photo.type,
                        photo.file,
                    )
                }

                const items = await getBodyCheckins(currentUid)
                setCheckins(items)
                showFitnessSuccessToast('Body check-in mis à jour.')
            })
        },
        [assertUid, runMutation],
    )

    const removeCheckin = useCallback(
        async (checkinId: string) => {
            await runMutation(async () => {
                const currentUid = assertUid()
                await deleteBodyCheckin(currentUid, checkinId)
                const items = await getBodyCheckins(currentUid)
                setCheckins(items)
                showFitnessSuccessToast('Body check-in supprimé.')
            })
        },
        [assertUid, runMutation],
    )

    return {
        checkins,
        isLoading,
        isMutating,
        error,
        loadCheckins,
        addCheckin,
        editCheckin,
        removeCheckin,
    }
}

export default useBodyCheckins
