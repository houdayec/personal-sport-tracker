import {
    getDoc,
    serverTimestamp,
    setDoc,
    type DocumentReference,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { userDocumentRef } from '@/features/fitness/common/services'
import {
    USER_PROFILE_SCHEMA_VERSION,
    type CreateUserProfileInput,
    type PreferredLengthUnit,
    type PreferredWeightUnit,
    type UpdateUserProfilePatch,
    type UserProfile,
    type UserProfileDocument,
} from '@/features/fitness/account/types/accountProfile'

const DEFAULT_WEIGHT_UNIT: PreferredWeightUnit = 'kg'
const DEFAULT_LENGTH_UNIT: PreferredLengthUnit = 'cm'

const toUserProfileRef = (uid: string): DocumentReference<UserProfileDocument> => {
    return userDocumentRef(uid) as DocumentReference<UserProfileDocument>
}

const isPreferredWeightUnit = (value: unknown): value is PreferredWeightUnit => {
    return value === 'kg' || value === 'lb'
}

const isPreferredLengthUnit = (value: unknown): value is PreferredLengthUnit => {
    return value === 'cm' || value === 'in'
}

const normalizeDisplayName = (value: string): string => {
    const trimmed = value.trim()

    if (!trimmed) {
        throw new Error('Le nom affiché est requis.')
    }

    return trimmed
}

const normalizeTimezone = (value?: string): string => {
    const trimmed = value?.trim()

    if (trimmed) {
        return trimmed
    }

    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
        return 'UTC'
    }
}

const userProfileFromSnapshot = (
    snapshot: QueryDocumentSnapshot<UserProfileDocument>,
): UserProfile => {
    const data = snapshot.data()

    return {
        id: snapshot.id,
        displayName:
            typeof data.displayName === 'string' && data.displayName.trim()
                ? data.displayName.trim()
                : 'Utilisateur',
        photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : undefined,
        preferredWeightUnit: isPreferredWeightUnit(data.preferredWeightUnit)
            ? data.preferredWeightUnit
            : DEFAULT_WEIGHT_UNIT,
        preferredLengthUnit: isPreferredLengthUnit(data.preferredLengthUnit)
            ? data.preferredLengthUnit
            : DEFAULT_LENGTH_UNIT,
        timezone: typeof data.timezone === 'string' ? data.timezone : normalizeTimezone(),
        isOnboarded: Boolean(data.isOnboarded),
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        schemaVersion: data.schemaVersion ?? USER_PROFILE_SCHEMA_VERSION,
    }
}

const buildCreatePayload = (data: CreateUserProfileInput): CreateUserProfileInput => {
    return {
        displayName: normalizeDisplayName(data.displayName),
        photoUrl: data.photoUrl?.trim() || undefined,
        preferredWeightUnit: isPreferredWeightUnit(data.preferredWeightUnit)
            ? data.preferredWeightUnit
            : DEFAULT_WEIGHT_UNIT,
        preferredLengthUnit: isPreferredLengthUnit(data.preferredLengthUnit)
            ? data.preferredLengthUnit
            : DEFAULT_LENGTH_UNIT,
        timezone: normalizeTimezone(data.timezone),
        isOnboarded: Boolean(data.isOnboarded),
    }
}

const buildPatchPayload = (patch: UpdateUserProfilePatch): UpdateUserProfilePatch => {
    const payload: UpdateUserProfilePatch = {}

    if (typeof patch.displayName === 'string') {
        payload.displayName = normalizeDisplayName(patch.displayName)
    }

    if (typeof patch.photoUrl === 'string') {
        payload.photoUrl = patch.photoUrl.trim()
    }

    if (isPreferredWeightUnit(patch.preferredWeightUnit)) {
        payload.preferredWeightUnit = patch.preferredWeightUnit
    }

    if (isPreferredLengthUnit(patch.preferredLengthUnit)) {
        payload.preferredLengthUnit = patch.preferredLengthUnit
    }

    if (typeof patch.timezone === 'string') {
        payload.timezone = normalizeTimezone(patch.timezone)
    }

    if (typeof patch.isOnboarded === 'boolean') {
        payload.isOnboarded = patch.isOnboarded
    }

    return payload
}

export const getCurrentUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const ref = toUserProfileRef(uid)
    const snapshot = await getDoc(ref)

    if (!snapshot.exists()) {
        return null
    }

    return userProfileFromSnapshot(snapshot as QueryDocumentSnapshot<UserProfileDocument>)
}

export const createUserProfileIfMissing = async (
    uid: string,
    data: CreateUserProfileInput,
): Promise<UserProfile> => {
    const existing = await getCurrentUserProfile(uid)

    if (existing) {
        return existing
    }

    const payload = buildCreatePayload(data)

    await setDoc(toUserProfileRef(uid), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: USER_PROFILE_SCHEMA_VERSION,
    })

    const created = await getCurrentUserProfile(uid)

    if (!created) {
        throw new Error('Impossible de créer le profil utilisateur.')
    }

    return created
}

export const updateUserProfile = async (
    uid: string,
    patch: UpdateUserProfilePatch,
): Promise<void> => {
    const payload = buildPatchPayload(patch)

    if (Object.keys(payload).length === 0) {
        return
    }

    await setDoc(
        toUserProfileRef(uid),
        {
            ...payload,
            updatedAt: serverTimestamp(),
            schemaVersion: USER_PROFILE_SCHEMA_VERSION,
        },
        { merge: true },
    )
}
