import {
    addDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    Timestamp,
    updateDoc,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { fitnessCollections } from '@/features/fitness/common/services'
import {
    BODY_MEASUREMENT_FIELDS,
    BODY_MEASUREMENT_SCHEMA_VERSION,
    BODY_MEASUREMENT_UNITS,
    createEmptyBodyMeasurementValues,
    type BodyMeasurementEntry,
    type BodyMeasurementEntryDocument,
    type BodyMeasurementEntryInput,
    type BodyMeasurementFieldKey,
    type BodyMeasurementUnit,
    type BodyMeasurementValues,
} from '@/features/fitness/body/types/bodyMeasurement'

const isBodyMeasurementUnit = (value: string): value is BodyMeasurementUnit => {
    return (BODY_MEASUREMENT_UNITS as readonly string[]).includes(value)
}

const normalizeMeasurementValues = (
    values: BodyMeasurementValues,
): BodyMeasurementValues => {
    const normalized = createEmptyBodyMeasurementValues()

    let hasAtLeastOneValue = false

    BODY_MEASUREMENT_FIELDS.forEach((field) => {
        const key = field.key as BodyMeasurementFieldKey
        const rawValue = values[key]

        if (rawValue === null || typeof rawValue === 'undefined') {
            normalized[key] = null
            return
        }

        if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) {
            throw new Error(`La valeur "${field.label}" doit être un nombre positif.`)
        }

        normalized[key] = Number(rawValue.toFixed(2))
        hasAtLeastOneValue = true
    })

    if (!hasAtLeastOneValue) {
        throw new Error('Renseigne au moins une mensuration.')
    }

    return normalized
}

const normalizeBodyMeasurementInput = (
    input: BodyMeasurementEntryInput,
): BodyMeasurementEntryInput => {
    if (!(input.measuredAt instanceof Date) || Number.isNaN(input.measuredAt.getTime())) {
        throw new Error('La date de mesure est invalide.')
    }

    if (!isBodyMeasurementUnit(input.unit)) {
        throw new Error('L’unité de mensuration est invalide.')
    }

    return {
        measuredAt: input.measuredAt,
        unit: input.unit,
        values: normalizeMeasurementValues(input.values),
        note: input.note?.trim() || undefined,
    }
}

const normalizeSnapshotValues = (raw: unknown): BodyMeasurementValues => {
    const normalized = createEmptyBodyMeasurementValues()
    const source = typeof raw === 'object' && raw ? (raw as Record<string, unknown>) : {}

    BODY_MEASUREMENT_FIELDS.forEach((field) => {
        const key = field.key as BodyMeasurementFieldKey
        const rawValue = source[key]

        if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
            normalized[key] = rawValue
            return
        }

        normalized[key] = null
    })

    return normalized
}

const bodyMeasurementEntryFromSnapshot = (
    snapshot: QueryDocumentSnapshot<BodyMeasurementEntryDocument>,
): BodyMeasurementEntry => {
    const data = snapshot.data()

    return {
        id: snapshot.id,
        measuredAt: data.measuredAt ?? null,
        unit: isBodyMeasurementUnit(data.unit) ? data.unit : 'cm',
        values: normalizeSnapshotValues(data.values),
        note: typeof data.note === 'string' ? data.note : undefined,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        schemaVersion: data.schemaVersion ?? BODY_MEASUREMENT_SCHEMA_VERSION,
    }
}

const getEntrySortTime = (entry: BodyMeasurementEntry): number => {
    return (
        entry.measuredAt?.toMillis?.() ??
        entry.updatedAt?.toMillis?.() ??
        entry.createdAt?.toMillis?.() ??
        0
    )
}

const sortEntriesByMeasuredAtDesc = (
    entries: BodyMeasurementEntry[],
): BodyMeasurementEntry[] => {
    return [...entries].sort((a, b) => getEntrySortTime(b) - getEntrySortTime(a))
}

export const listBodyMeasurementEntries = async (
    uid: string,
): Promise<BodyMeasurementEntry[]> => {
    const entriesRef = fitnessCollections.bodyMeasurementEntries<BodyMeasurementEntryDocument>(uid)
    const snapshot = await getDocs(entriesRef)

    return sortEntriesByMeasuredAtDesc(snapshot.docs.map(bodyMeasurementEntryFromSnapshot))
}

export const getBodyMeasurementEntryById = async (
    uid: string,
    entryId: string,
): Promise<BodyMeasurementEntry> => {
    const entryRef = doc(
        fitnessCollections.bodyMeasurementEntries<BodyMeasurementEntryDocument>(uid),
        entryId,
    )
    const snapshot = await getDoc(entryRef)

    if (!snapshot.exists()) {
        throw new Error('Snapshot de mensurations introuvable.')
    }

    return bodyMeasurementEntryFromSnapshot(
        snapshot as QueryDocumentSnapshot<BodyMeasurementEntryDocument>,
    )
}

export const createBodyMeasurementEntry = async (
    uid: string,
    input: BodyMeasurementEntryInput,
): Promise<string> => {
    const normalized = normalizeBodyMeasurementInput(input)
    const entriesRef = fitnessCollections.bodyMeasurementEntries<BodyMeasurementEntryDocument>(uid)

    const docRef = await addDoc(entriesRef, {
        measuredAt: Timestamp.fromDate(normalized.measuredAt),
        unit: normalized.unit,
        values: normalized.values,
        note: normalized.note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_MEASUREMENT_SCHEMA_VERSION,
    })

    return docRef.id
}

export const updateBodyMeasurementEntry = async (
    uid: string,
    entryId: string,
    input: BodyMeasurementEntryInput,
): Promise<void> => {
    const normalized = normalizeBodyMeasurementInput(input)
    const entryRef = doc(
        fitnessCollections.bodyMeasurementEntries<BodyMeasurementEntryDocument>(uid),
        entryId,
    )

    await updateDoc(entryRef, {
        measuredAt: Timestamp.fromDate(normalized.measuredAt),
        unit: normalized.unit,
        values: normalized.values,
        note: normalized.note,
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_MEASUREMENT_SCHEMA_VERSION,
    })
}

export const deleteBodyMeasurementEntry = async (
    uid: string,
    entryId: string,
): Promise<void> => {
    const entryRef = doc(
        fitnessCollections.bodyMeasurementEntries<BodyMeasurementEntryDocument>(uid),
        entryId,
    )

    await deleteDoc(entryRef)
}
