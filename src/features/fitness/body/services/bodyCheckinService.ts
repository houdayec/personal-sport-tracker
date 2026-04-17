import {
    addDoc,
    deleteField,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    Timestamp,
    updateDoc,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/firebase'
import { fitnessCollections } from '@/features/fitness/common/services'
import {
    BODY_CHECKIN_FIELDS,
    BODY_CHECKIN_PHOTO_TYPES,
    BODY_CHECKIN_SCHEMA_VERSION,
    BODY_CHECKIN_UNITS,
    createEmptyBodyCheckinValues,
    type BodyCheckin,
    type BodyCheckinDocument,
    type BodyCheckinFieldKey,
    type BodyCheckinInput,
    type BodyCheckinPhoto,
    type BodyCheckinPhotoType,
    type BodyCheckinUnit,
    type BodyCheckinValues,
} from '@/features/fitness/body/types/bodyCheckin'

const MAX_BODY_CHECKIN_PHOTOS = 3

const isBodyCheckinUnit = (value: string): value is BodyCheckinUnit => {
    return (BODY_CHECKIN_UNITS as readonly string[]).includes(value)
}

const isBodyCheckinPhotoType = (value: string): value is BodyCheckinPhotoType => {
    return (BODY_CHECKIN_PHOTO_TYPES as readonly string[]).includes(value)
}

const normalizeValues = (values: BodyCheckinValues): BodyCheckinValues => {
    const normalized = createEmptyBodyCheckinValues()

    BODY_CHECKIN_FIELDS.forEach((field) => {
        const key = field.key as BodyCheckinFieldKey
        const rawValue = values[key]

        if (typeof rawValue === 'undefined' || rawValue === null) {
            normalized[key] = null
            return
        }

        if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) {
            throw new Error(`La valeur "${field.label}" doit être un nombre positif.`)
        }

        normalized[key] = Number(rawValue.toFixed(2))
    })

    return normalized
}

const normalizePhotos = (photos: BodyCheckinPhoto[] | undefined): BodyCheckinPhoto[] => {
    if (!Array.isArray(photos)) {
        return []
    }

    const byType = new Map<BodyCheckinPhotoType, BodyCheckinPhoto>()

    photos.forEach((photo) => {
        if (!photo || typeof photo !== 'object') {
            return
        }

        const type = typeof photo.type === 'string' ? photo.type : ''
        const url = typeof photo.url === 'string' ? photo.url.trim() : ''
        const path = typeof photo.path === 'string' ? photo.path.trim() : ''

        if (!isBodyCheckinPhotoType(type) || !url) {
            return
        }

        byType.set(type, {
            type,
            url,
            ...(path ? { path } : {}),
        })
    })

    return Array.from(byType.values()).slice(0, MAX_BODY_CHECKIN_PHOTOS)
}

const hasAtLeastOneMeasurement = (values: BodyCheckinValues): boolean => {
    return Object.values(values).some((value) => typeof value === 'number' && value > 0)
}

const normalizeBodyCheckinInput = (input: BodyCheckinInput): BodyCheckinInput => {
    if (!(input.measuredAt instanceof Date) || Number.isNaN(input.measuredAt.getTime())) {
        throw new Error('La date du check-in est invalide.')
    }

    if (!isBodyCheckinUnit(input.unit)) {
        throw new Error('L’unité de mensuration est invalide.')
    }

    const normalizedValues = normalizeValues(input.values)
    const normalizedNote = input.note?.trim()
    const normalizedPhotos = normalizePhotos(input.photos)
    const normalizedWeight =
        typeof input.weight === 'number' && Number.isFinite(input.weight) && input.weight > 0
            ? Number(input.weight.toFixed(2))
            : undefined

    if (
        !hasAtLeastOneMeasurement(normalizedValues) &&
        typeof normalizedWeight === 'undefined' &&
        normalizedPhotos.length === 0 &&
        !normalizedNote
    ) {
        throw new Error(
            'Ajoute au moins une donnée (mensuration, poids, photo ou note).',
        )
    }

    return {
        measuredAt: input.measuredAt,
        unit: input.unit,
        values: normalizedValues,
        ...(typeof normalizedWeight === 'number' ? { weight: normalizedWeight } : {}),
        ...(normalizedPhotos.length > 0 ? { photos: normalizedPhotos } : {}),
        ...(normalizedNote ? { note: normalizedNote } : {}),
    }
}

const normalizeValuesFromSnapshot = (raw: unknown): BodyCheckinValues => {
    const normalized = createEmptyBodyCheckinValues()
    const source = typeof raw === 'object' && raw ? (raw as Record<string, unknown>) : {}

    BODY_CHECKIN_FIELDS.forEach((field) => {
        const key = field.key as BodyCheckinFieldKey
        const rawValue = source[key]

        if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
            normalized[key] = rawValue
            return
        }

        normalized[key] = null
    })

    return normalized
}

const normalizePhotosFromSnapshot = (raw: unknown): BodyCheckinPhoto[] => {
    if (!Array.isArray(raw)) {
        return []
    }

    return normalizePhotos(raw as BodyCheckinPhoto[])
}

const bodyCheckinFromSnapshot = (
    snapshot: QueryDocumentSnapshot<BodyCheckinDocument>,
): BodyCheckin => {
    const data = snapshot.data()

    return {
        id: snapshot.id,
        measuredAt: data.measuredAt ?? null,
        unit: isBodyCheckinUnit(data.unit) ? data.unit : 'cm',
        values: normalizeValuesFromSnapshot(data.values),
        ...(typeof data.weight === 'number' ? { weight: data.weight } : {}),
        photos: normalizePhotosFromSnapshot(data.photos),
        note: typeof data.note === 'string' ? data.note : undefined,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        schemaVersion: data.schemaVersion ?? BODY_CHECKIN_SCHEMA_VERSION,
    }
}

const getCheckinSortTime = (entry: BodyCheckin): number => {
    return (
        entry.measuredAt?.toMillis?.() ??
        entry.updatedAt?.toMillis?.() ??
        entry.createdAt?.toMillis?.() ??
        0
    )
}

const sortCheckinsByMeasuredAtDesc = (entries: BodyCheckin[]): BodyCheckin[] => {
    return [...entries].sort((a, b) => getCheckinSortTime(b) - getCheckinSortTime(a))
}

const getFileExtension = (file: File): string => {
    const maybeNameExt = file.name.split('.').pop()?.trim().toLowerCase()

    if (maybeNameExt && /^[a-z0-9]+$/.test(maybeNameExt)) {
        return maybeNameExt
    }

    if (file.type === 'image/png') {
        return 'png'
    }
    if (file.type === 'image/webp') {
        return 'webp'
    }
    return 'jpg'
}

export const getBodyCheckins = async (uid: string): Promise<BodyCheckin[]> => {
    const checkinsRef = fitnessCollections.bodyCheckins<BodyCheckinDocument>(uid)
    const snapshot = await getDocs(checkinsRef)

    return sortCheckinsByMeasuredAtDesc(snapshot.docs.map(bodyCheckinFromSnapshot))
}

export const getBodyCheckinById = async (
    uid: string,
    checkinId: string,
): Promise<BodyCheckin> => {
    const checkinRef = doc(
        fitnessCollections.bodyCheckins<BodyCheckinDocument>(uid),
        checkinId,
    )
    const snapshot = await getDoc(checkinRef)

    if (!snapshot.exists()) {
        throw new Error('Body check-in introuvable.')
    }

    return bodyCheckinFromSnapshot(
        snapshot as QueryDocumentSnapshot<BodyCheckinDocument>,
    )
}

export const createBodyCheckin = async (
    uid: string,
    input: BodyCheckinInput,
): Promise<string> => {
    const normalized = normalizeBodyCheckinInput(input)
    const checkinsRef = fitnessCollections.bodyCheckins<BodyCheckinDocument>(uid)

    const docRef = await addDoc(checkinsRef, {
        measuredAt: Timestamp.fromDate(normalized.measuredAt),
        unit: normalized.unit,
        values: normalized.values,
        ...(typeof normalized.weight === 'number' ? { weight: normalized.weight } : {}),
        ...(Array.isArray(normalized.photos) && normalized.photos.length > 0
            ? { photos: normalized.photos }
            : {}),
        ...(normalized.note ? { note: normalized.note } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_CHECKIN_SCHEMA_VERSION,
    })

    return docRef.id
}

export const updateBodyCheckin = async (
    uid: string,
    checkinId: string,
    input: BodyCheckinInput,
): Promise<void> => {
    const normalized = normalizeBodyCheckinInput(input)
    const checkinRef = doc(
        fitnessCollections.bodyCheckins<BodyCheckinDocument>(uid),
        checkinId,
    )

    await updateDoc(checkinRef, {
        measuredAt: Timestamp.fromDate(normalized.measuredAt),
        unit: normalized.unit,
        values: normalized.values,
        ...(typeof normalized.weight === 'number'
            ? { weight: normalized.weight }
            : { weight: deleteField() }),
        ...(Array.isArray(normalized.photos) && normalized.photos.length > 0
            ? { photos: normalized.photos }
            : { photos: deleteField() }),
        ...(normalized.note ? { note: normalized.note } : { note: deleteField() }),
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_CHECKIN_SCHEMA_VERSION,
    })
}

export const uploadBodyCheckinPhoto = async (
    uid: string,
    checkinId: string,
    type: BodyCheckinPhotoType,
    file: File,
): Promise<BodyCheckinPhoto> => {
    if (!isBodyCheckinPhotoType(type)) {
        throw new Error('Type de photo invalide.')
    }

    const checkin = await getBodyCheckinById(uid, checkinId)
    const extension = getFileExtension(file)
    const path = `users/${uid}/body-checkins/${checkinId}/${type}-${Date.now()}.${extension}`
    const photoRef = ref(storage, path)

    await uploadBytes(photoRef, file)
    const url = await getDownloadURL(photoRef)

    const existingPhoto = checkin.photos.find((photo) => photo.type === type)
    if (existingPhoto?.path) {
        try {
            await deleteObject(ref(storage, existingPhoto.path))
        } catch {
            // Ignore stale storage path.
        }
    }

    const nextPhotos = [
        ...checkin.photos.filter((photo) => photo.type !== type),
        { type, url, path },
    ].slice(0, MAX_BODY_CHECKIN_PHOTOS)
    const checkinRef = doc(
        fitnessCollections.bodyCheckins<BodyCheckinDocument>(uid),
        checkinId,
    )

    await updateDoc(checkinRef, {
        photos: nextPhotos,
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_CHECKIN_SCHEMA_VERSION,
    })

    return { type, url, path }
}

export const deleteBodyCheckinPhoto = async (
    uid: string,
    checkinId: string,
    photoPath: string,
): Promise<void> => {
    const targetPath = photoPath.trim()
    if (!targetPath) {
        return
    }

    const checkin = await getBodyCheckinById(uid, checkinId)
    const nextPhotos = checkin.photos.filter((photo) => photo.path !== targetPath)
    const checkinRef = doc(
        fitnessCollections.bodyCheckins<BodyCheckinDocument>(uid),
        checkinId,
    )

    try {
        await deleteObject(ref(storage, targetPath))
    } catch {
        // Ignore missing file in storage.
    }

    await updateDoc(checkinRef, {
        ...(nextPhotos.length > 0 ? { photos: nextPhotos } : { photos: deleteField() }),
        updatedAt: serverTimestamp(),
        schemaVersion: BODY_CHECKIN_SCHEMA_VERSION,
    })
}

export const deleteBodyCheckin = async (uid: string, checkinId: string): Promise<void> => {
    const checkin = await getBodyCheckinById(uid, checkinId)

    await Promise.all(
        checkin.photos.map(async (photo) => {
            if (!photo.path) {
                return
            }
            try {
                await deleteObject(ref(storage, photo.path))
            } catch {
                // Ignore stale storage paths on deletion.
            }
        }),
    )

    const checkinRef = doc(
        fitnessCollections.bodyCheckins<BodyCheckinDocument>(uid),
        checkinId,
    )
    await deleteDoc(checkinRef)
}
