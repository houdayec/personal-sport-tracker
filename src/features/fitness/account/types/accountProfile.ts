import type { Timestamp } from 'firebase/firestore'

export const USER_PROFILE_SCHEMA_VERSION = 1 as const

export type PreferredWeightUnit = 'kg' | 'lb'
export type PreferredLengthUnit = 'cm' | 'in'

export interface UserProfileDocument {
    displayName: string
    photoUrl?: string
    preferredWeightUnit?: PreferredWeightUnit
    preferredLengthUnit?: PreferredLengthUnit
    timezone?: string
    isOnboarded?: boolean
    createdAt: Timestamp | null
    updatedAt: Timestamp | null
    schemaVersion: number
}

export interface UserProfile extends UserProfileDocument {
    id: string
}

export interface CreateUserProfileInput {
    displayName: string
    photoUrl?: string
    preferredWeightUnit?: PreferredWeightUnit
    preferredLengthUnit?: PreferredLengthUnit
    timezone?: string
    isOnboarded?: boolean
}

export interface UpdateUserProfilePatch {
    displayName?: string
    photoUrl?: string
    preferredWeightUnit?: PreferredWeightUnit
    preferredLengthUnit?: PreferredLengthUnit
    timezone?: string
    isOnboarded?: boolean
}
