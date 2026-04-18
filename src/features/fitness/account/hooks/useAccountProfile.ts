import { useCallback, useEffect, useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/firebase'
import {
    buildUserDataExportBundle,
    downloadUserDataExport,
} from '@/features/fitness/account/services/accountExportService'
import {
    createUserProfileIfMissing,
    getCurrentUserProfile,
    updateUserProfile,
} from '@/features/fitness/account/services/accountProfileService'
import { logFitnessErrorDev } from '@/features/fitness/common/utils/debugError'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import type {
    PreferredLengthUnit,
    PreferredThemeMode,
    PreferredWeightUnit,
    UserProfile,
} from '@/features/fitness/account/types/accountProfile'
import { setMode, setUser, useAppDispatch, useAppSelector } from '@/store'
import { buildUiAvatarUrl } from '@/utils/uiAvatar'

const getErrorMessage = (error: unknown): string => {
    logFitnessErrorDev('useAccountProfile', error)

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue. Merci de réessayer.'
}

const useAccountProfile = () => {
    const dispatch = useAppDispatch()
    const uid = useAppSelector((state) => state.auth.session.uid)
    const authEmail = useAppSelector((state) => state.auth.user.email)
    const authDisplayName = useAppSelector((state) => state.auth.user.userName)
    const authAuthority = useAppSelector((state) => state.auth.user.authority)

    const syncAuthIdentity = useCallback(
        async (displayName: string) => {
            const avatarUrl = buildUiAvatarUrl(displayName)

            if (auth.currentUser) {
                const shouldUpdateAuthProfile =
                    auth.currentUser.displayName !== displayName ||
                    auth.currentUser.photoURL !== avatarUrl

                if (shouldUpdateAuthProfile) {
                    await updateProfile(auth.currentUser, {
                        displayName,
                        photoURL: avatarUrl,
                    })
                }
            }

            dispatch(
                setUser({
                    avatar: avatarUrl,
                    userName: displayName,
                    authority: Array.from(
                        new Set([
                            'USER',
                            ...(authAuthority || []),
                            auth.currentUser?.uid || '',
                        ].filter(Boolean)),
                    ),
                    email: auth.currentUser?.email || authEmail || '',
                }),
            )

            return avatarUrl
        },
        [dispatch, authAuthority, authEmail],
    )

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isSavingPreferences, setIsSavingPreferences] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
            const defaultAvatarUrl = buildUiAvatarUrl(defaultDisplayName)

            await createUserProfileIfMissing(currentUid, {
                displayName: defaultDisplayName,
                photoUrl: defaultAvatarUrl,
                preferredWeightUnit: 'kg',
                preferredLengthUnit: 'cm',
                preferredThemeMode: 'light',
                weeklySessionGoal: 4,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                isOnboarded: true,
            })

            const currentProfile = await getCurrentUserProfile(currentUid)
            if (currentProfile?.displayName) {
                const avatarUrl = await syncAuthIdentity(currentProfile.displayName)
                currentProfile.photoUrl = avatarUrl
            }
            if (currentProfile?.preferredThemeMode) {
                dispatch(setMode(currentProfile.preferredThemeMode))
            }
            setProfile(currentProfile)
        } catch (loadError) {
            setError(getErrorMessage(loadError))
            setProfile(null)
        } finally {
            setIsLoading(false)
        }
    }, [assertUid, authDisplayName, authEmail, dispatch, syncAuthIdentity])

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

            try {
                const currentUid = assertUid()
                const normalizedDisplayName = input.displayName.trim()
                const avatarUrl = await syncAuthIdentity(normalizedDisplayName)

                await updateUserProfile(currentUid, {
                    displayName: normalizedDisplayName,
                    photoUrl: avatarUrl,
                })

                patchLocalProfile({
                    displayName: normalizedDisplayName,
                    photoUrl: avatarUrl,
                })
                showFitnessSuccessToast('Profil mis à jour.')
            } catch (saveError) {
                showFitnessErrorToast(getErrorMessage(saveError))
            } finally {
                setIsSavingProfile(false)
            }
        },
        [assertUid, patchLocalProfile, syncAuthIdentity],
    )

    const savePreferences = useCallback(
        async (input: {
            preferredWeightUnit: PreferredWeightUnit
            preferredLengthUnit: PreferredLengthUnit
            preferredThemeMode: PreferredThemeMode
            weeklySessionGoal: number
            timezone: string
        }) => {
            setIsSavingPreferences(true)
            setError(null)

            try {
                const currentUid = assertUid()
                await updateUserProfile(currentUid, {
                    preferredWeightUnit: input.preferredWeightUnit,
                    preferredLengthUnit: input.preferredLengthUnit,
                    preferredThemeMode: input.preferredThemeMode,
                    weeklySessionGoal: input.weeklySessionGoal,
                    timezone: input.timezone,
                })

                patchLocalProfile({
                    preferredWeightUnit: input.preferredWeightUnit,
                    preferredLengthUnit: input.preferredLengthUnit,
                    preferredThemeMode: input.preferredThemeMode,
                    weeklySessionGoal: input.weeklySessionGoal,
                    timezone: input.timezone.trim(),
                })
                dispatch(setMode(input.preferredThemeMode))
                showFitnessSuccessToast('Préférences mises à jour.')
            } catch (saveError) {
                showFitnessErrorToast(getErrorMessage(saveError))
            } finally {
                setIsSavingPreferences(false)
            }
        },
        [assertUid, dispatch, patchLocalProfile],
    )

    const exportData = useCallback(async () => {
        setIsExporting(true)
        setError(null)

        try {
            const currentUid = assertUid()
            const payload = await buildUserDataExportBundle(currentUid)
            downloadUserDataExport(currentUid, payload)
            showFitnessSuccessToast('Export JSON généré.')
        } catch (exportError) {
            showFitnessErrorToast(getErrorMessage(exportError))
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
        saveProfile,
        savePreferences,
        exportData,
        reloadProfile: loadProfile,
    }
}

export default useAccountProfile
