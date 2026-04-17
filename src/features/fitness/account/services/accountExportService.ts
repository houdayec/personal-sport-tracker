import { getDocs } from 'firebase/firestore'
import { fitnessCollections } from '@/features/fitness/common/services'
import { getCurrentUserProfile } from '@/features/fitness/account/services/accountProfileService'

const isTimestampLike = (value: unknown): value is { toDate: () => Date } => {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    )
}

const serializeFirestoreValue = (value: unknown): unknown => {
    if (isTimestampLike(value)) {
        return value.toDate().toISOString()
    }

    if (Array.isArray(value)) {
        return value.map((item) => serializeFirestoreValue(item))
    }

    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).reduce<
            Record<string, unknown>
        >((acc, [key, nestedValue]) => {
            acc[key] = serializeFirestoreValue(nestedValue)
            return acc
        }, {})
    }

    return value
}

const serializeDocs = (
    docs: Array<{ id: string; data: () => Record<string, unknown> }>,
) => {
    return docs.map((snapshot) => ({
        id: snapshot.id,
        ...serializeFirestoreValue(snapshot.data()),
    }))
}

export const buildUserDataExportBundle = async (uid: string) => {
    const [
        profile,
        exercisesSnapshot,
        templatesSnapshot,
        sessionsSnapshot,
        weightSnapshot,
        measurementSnapshot,
        checkinsSnapshot,
    ] = await Promise.all([
        getCurrentUserProfile(uid),
        getDocs(fitnessCollections.exercises(uid)),
        getDocs(fitnessCollections.workoutTemplates(uid)),
        getDocs(fitnessCollections.workoutSessions(uid)),
        getDocs(fitnessCollections.bodyWeightEntries(uid)),
        getDocs(fitnessCollections.bodyMeasurementEntries(uid)),
        getDocs(fitnessCollections.bodyCheckins(uid)),
    ])

    return {
        exportedAt: new Date().toISOString(),
        uid,
        profile: profile ? serializeFirestoreValue(profile) : null,
        data: {
            exercises: serializeDocs(exercisesSnapshot.docs),
            workoutTemplates: serializeDocs(templatesSnapshot.docs),
            workoutSessions: serializeDocs(sessionsSnapshot.docs),
            bodyWeightEntries: serializeDocs(weightSnapshot.docs),
            bodyMeasurementEntries: serializeDocs(measurementSnapshot.docs),
            bodyCheckins: serializeDocs(checkinsSnapshot.docs),
        },
    }
}

export const downloadUserDataExport = (
    uid: string,
    payload: unknown,
): void => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `sport-tracker-export-${uid}-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
}
