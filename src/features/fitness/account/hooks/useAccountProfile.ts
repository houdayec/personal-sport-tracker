import { useCallback, useEffect, useState } from 'react'
import {
    buildUserDataExportBundle,
    downloadUserDataExport,
} from '@/features/fitness/account/services/accountExportService'
import {
    createUserProfileIfMissing,
    getCurrentUserProfile,
    updateUserProfile,
} from '@/features/fitness/account/services/accountProfileService'
import type {
    PreferredLengthUnit,
    PreferredWeightUnit,
    UserProfile,
} from '@/features/fitness/account/types/accountProfile'
import { useAppSelector } from '@/store'

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useAccountProfile = () => {
    const uid = useAppSelector((state) => state.auth.session.uid)
    const authEmail = useAppSelector((state) => state.auth.user.email)
    const authDisplayName = useAppSelector((state) => state.auth.user.userName)
    const authAvatar = useAppSelector((state) => state.auth.user.avatar)

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isSavingPreferences, setIsSavingPreferences] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const assertUid = useCallback(() => {
        if (!uid) {
            throw new Error('Utilisateur non connecté.')
        }

        return uid
    }, [uid])

    const loadProfile = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const currentUid = assertUid()

            const defaultDisplayName =
                authDisplayName?.trim() ||
                authEmail?.split('@')[0] ||
                'Utilisateur'

            await createUserProfileIfMissing(currentUid, {
                displayName: defaultDisplayName,
                photoUrl: authAvatar || undefined,
                preferredWeightUnit: 'kg',
                preferredLengthUnit: 'cm',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                isOnboarded: true,
            })

            const currentProfile = await getCurrentUserProfile(currentUid)
            setProfile(currentProfile)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setProfile(null)
        } finally {
            setIsLoading(false)
        }
    }, [assertUid, authDisplayName, authEmail, authAvatar])

    useEffect(() => {
        loadProfile()
    }, [loadProfile])

    const patchLocalProfile = useCallback((patch: Partial<UserProfile>) => {
        setProfile((previous) => {
            if (!previous) {
                return previous
            }

            return {
                ...previous,
                ...patch,
            }
        })
    }, [])

    const saveProfile = useCallback(
        async (input: { displayName: string; photoUrl?: string }) => {
            setIsSavingProfile(true)
            setError(null)
            setSuccessMessage(null)

            try {
                const currentUid = assertUid()
                await updateUserProfile(currentUid, {
                    displayName: input.displayName,
                    photoUrl: input.photoUrl || '',
                })

                patchLocalProfile({
                    displayName: input.displayName.trim(),
                    photoUrl: input.photoUrl?.trim() || undefined,
                })
                setSuccessMessage('Profil mis à jour.')
            } catch (saveError) {
                setError(getErrorMessage(saveError))
                throw saveError
            } finally {
                setIsSavingProfile(false)
            }
        },
        [assertUid, patchLocalProfile],
    )

    const savePreferences = useCallback(
        async (input: {
            preferredWeightUnit: PreferredWeightUnit
            preferredLengthUnit: PreferredLengthUnit
            timezone: string
        }) => {
            setIsSavingPreferences(true)
            setError(null)
            setSuccessMessage(null)

            try {
                const currentUid = assertUid()
                await updateUserProfile(currentUid, {
                    preferredWeightUnit: input.preferredWeightUnit,
                    preferredLengthUnit: input.preferredLengthUnit,
                    timezone: input.timezone,
                })

                patchLocalProfile({
                    preferredWeightUnit: input.preferredWeightUnit,
                    preferredLengthUnit: input.preferredLengthUnit,
                    timezone: input.timezone.trim(),
                })
                setSuccessMessage('Préférences mises à jour.')
            } catch (saveError) {
                setError(getErrorMessage(saveError))
                throw saveError
            } finally {
                setIsSavingPreferences(false)
            }
        },
        [assertUid, patchLocalProfile],
    )

    const exportData = useCallback(async () => {
        setIsExporting(true)
        setError(null)
        setSuccessMessage(null)

        try {
            const currentUid = assertUid()
            const payload = await buildUserDataExportBundle(currentUid)
            downloadUserDataExport(currentUid, payload)
            setSuccessMessage('Export JSON généré.')
        } catch (exportError) {
            setError(getErrorMessage(exportError))
            throw exportError
        } finally {
            setIsExporting(false)
        }
    }, [assertUid])

    return {
        uid,
        authEmail: authEmail || '',
        profile,
        isLoading,
        isSavingProfile,
        isSavingPreferences,
        isExporting,
        error,
        successMessage,
        saveProfile,
        savePreferences,
        exportData,
        reloadProfile: loadProfile,
    }
}

export default useAccountProfile
