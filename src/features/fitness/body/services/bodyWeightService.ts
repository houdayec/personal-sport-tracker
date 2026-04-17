import {
    addDoc,
    deleteField,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    Timestamp,
    updateDoc,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { fitnessCollections } from '@/features/fitness/common/services'
import {
    BODY_WEIGHT_SCHEMA_VERSION,
    BODY_WEIGHT_UNITS,
    type BodyWeightEntry,
    type BodyWeightEntryDocument,
    type BodyWeightEntryInput,
    type BodyWeightUnit,
} from '@/features/fitness/body/types/bodyWeight'

const isBodyWeightUnit = (value: string): value is BodyWeightUnit => {
    return (BODY_WEIGHT_UNITS as readonly string[]).includes(value)
}

const normalizeBodyWeightInput = (
    input: BodyWeightEntryInput,
): BodyWeightEntryInput => {
    if (!(input.measuredAt instanceof Date) || Number.isNaN(input.measuredAt.getTime())) {
        throw new Error('La date de mesure est invalide.')
    }

    if (typeof input.weight !== 'number' || !Number.isFinite(input.weight) || input.weight <= 0) {
        throw new Error('Le poids doit être un nombre positif.')
    }

    if (!isBodyWeightUnit(input.unit)) {
        throw new Error('L’unité de poids est invalide.')
    }

    const trimmedNote = input.note?.trim()

    return {
        measuredAt: input.measuredAt,
        weight: Number(input.weight.toFixed(2)),
        unit: input.unit,
        note: trimmedNote || undefined,
    }
}

const bodyWeightEntryFromSnapshot = (
    snapshot: QueryDocumentSnapshot<BodyWeightEntryDocument>,
): BodyWeightEntry => {
    const data = snapshot.data()

    return {
        id: snapshot.id,
        measuredAt: data.measuredAt ?? null,
        weight: data.weight,
        unit: isBodyWeightUnit(data.unit) ? data.unit : 'kg',
        note: typeof data.note === 'string' ? data.note : undefined,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        schemaVersion: data.schemaVersion ?? BODY_WEIGHT_SCHEMA_VERSION,
    }
}

const getEntrySortTime = (entry: BodyWeightEntry): number => {
    return (
        entry.measuredAt?.toMillis?.() ??
        entry.updatedAt?.toMillis?.() ??
        entry.createdAt?.toMillis?.() ??
        0
    )
}

const sortEntriesByMeasuredAtDesc = (entries: BodyWeightEntry[]): BodyWeightEntry[] => {
    return [...entries].sort((a, b) => getEntrySortTime(b) - getEntrySortTime(a))
}

export const listBodyWeightEntries = async (uid: string): Promise<BodyWeightEntry[]> => {
    const entriesRef = fitnessCollections.bodyWeightEntries<BodyWeightEntryDocument>(uid)
    const snapshot = await getDocs(entriesRef)

    return sortEntriesByMeasuredAtDesc(snapshot.docs.map(bodyWeightEntryFromSnapshot))
}

export const createBodyWeightEntry = async (
    uid: string,
    input: BodyWeightEntryInput,
): Promise<string> => {
    const normalized = normalizeBodyWeightInput(input)
    const entriesRef = fitnessCollections.bodyWeightEntries<BodyWeightEntryDocument>(uid)

    const docRef = await addDoc(entriesRef, {
        measuredAt: Timestamp.fromDate(normalized.measuredAt),
        weight: normalized.weight,
        unit: normalized.unit,
        ...(normalized.note ? { note: normalized.note } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_WEIGHT_SCHEMA_VERSION,
    })

    return docRef.id
}

export const updateBodyWeightEntry = async (
    uid: string,
    entryId: string,
    input: BodyWeightEntryInput,
): Promise<void> => {
    const normalized = normalizeBodyWeightInput(input)
    const entryRef = doc(
        fitnessCollections.bodyWeightEntries<BodyWeightEntryDocument>(uid),
        entryId,
    )

    await updateDoc(entryRef, {
        measuredAt: Timestamp.fromDate(normalized.measuredAt),
        weight: normalized.weight,
        unit: normalized.unit,
        ...(normalized.note ? { note: normalized.note } : { note: deleteField() }),
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_WEIGHT_SCHEMA_VERSION,
    })
}

export const deleteBodyWeightEntry = async (
    uid: string,
    entryId: string,
): Promise<void> => {
    const entryRef = doc(
        fitnessCollections.bodyWeightEntries<BodyWeightEntryDocument>(uid),
        entryId,
    )

    await deleteDoc(entryRef)
}
