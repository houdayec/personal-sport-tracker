import type { Timestamp } from 'firebase/firestore'
import type { Mode } from '@/@types/theme'

export const USER_PROFILE_SCHEMA_VERSION = 1 as const

export type PreferredWeightUnit = 'kg' | 'lb'
export type PreferredLengthUnit = 'cm' | 'in'
export type PreferredThemeMode = Mode

export interface BreathingGuidanceDefaults {
    soundEnabled: boolean
    voiceEnabled: boolean
    vibrationEnabled: boolean
}

export interface UserProfileDocument {
    displayName: string
    photoUrl?: string
    preferredWeightUnit?: PreferredWeightUnit
    preferredLengthUnit?: PreferredLengthUnit
    preferredThemeMode?: PreferredThemeMode
    weeklySessionGoal?: number
    breathingGuidanceDefaults?: BreathingGuidanceDefaults
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
    preferredThemeMode?: PreferredThemeMode
    weeklySessionGoal?: number
    breathingGuidanceDefaults?: BreathingGuidanceDefaults
    timezone?: string
    isOnboarded?: boolean
}

export interface UpdateUserProfilePatch {
    displayName?: string
    photoUrl?: string
    preferredWeightUnit?: PreferredWeightUnit
    preferredLengthUnit?: PreferredLengthUnit
    preferredThemeMode?: PreferredThemeMode
    weeklySessionGoal?: number
    breathingGuidanceDefaults?: BreathingGuidanceDefaults
    timezone?: string
    isOnboarded?: boolean
}
