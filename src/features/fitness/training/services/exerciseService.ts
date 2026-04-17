import {
    addDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { fitnessCollections } from '@/features/fitness/common/services'
import {
    EXERCISE_SCHEMA_VERSION,
    type Exercise,
    type ExerciseFirestoreDocument,
    type ExerciseInput,
    type ExerciseSource,
} from '@/features/fitness/training/types/exercise'

const normalizeExerciseInput = (input: ExerciseInput): ExerciseInput => {
    const normalized = {
        name: input.name.trim(),
        muscleGroup: input.muscleGroup.trim(),
        equipment: input.equipment.trim(),
    }

    if (!normalized.name) {
        throw new Error('Le nom de l\'exercice est requis.')
    }

    if (!normalized.muscleGroup) {
        throw new Error('Le groupe musculaire est requis.')
    }

    if (!normalized.equipment) {
        throw new Error('Le matériel est requis.')
    }

    return normalized
}

const exerciseFromSnapshot = (
    snapshot: QueryDocumentSnapshot<ExerciseFirestoreDocument>,
    exerciseSource: ExerciseSource,
): Exercise => {
    const data = snapshot.data()

    return {
        id: snapshot.id,
        name: data.name,
        muscleGroup: data.muscleGroup,
        equipment: data.equipment,
        isArchived: Boolean(data.isArchived),
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        schemaVersion: data.schemaVersion ?? EXERCISE_SCHEMA_VERSION,
        exerciseSource,
    }
}

const sortByUpdatedAtDesc = (exercises: Exercise[]): Exercise[] => {
    return [...exercises].sort((a, b) => {
        const aTime = a.updatedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0
        const bTime = b.updatedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0
        return bTime - aTime
    })
}

const listExercisesByArchiveState = async (
    uid: string,
    isArchived: boolean,
): Promise<Exercise[]> => {
    const exercisesRef = fitnessCollections.exercises<ExerciseFirestoreDocument>(uid)
    const exercisesQuery = query(exercisesRef, where('isArchived', '==', isArchived))
    const snapshot = await getDocs(exercisesQuery)

    const exercises = snapshot.docs.map((exercise) =>
        exerciseFromSnapshot(exercise, 'user'),
    )

    return sortByUpdatedAtDesc(exercises)
}

export const listGlobalExercises = async (): Promise<Exercise[]> => {
    const exercisesRef = fitnessCollections.globalExercises<ExerciseFirestoreDocument>()
    const snapshot = await getDocs(exercisesRef)

    const exercises = snapshot.docs
        .map((exercise) => exerciseFromSnapshot(exercise, 'global'))
        .filter((exercise) => !exercise.isArchived)

    return sortByUpdatedAtDesc(exercises)
}

const sortMergedExercises = (exercises: Exercise[]): Exercise[] => {
    return [...exercises].sort((a, b) => {
        if (a.exerciseSource !== b.exerciseSource) {
            return a.exerciseSource === 'global' ? -1 : 1
        }

        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    })
}

const isPermissionDeniedError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
        return false
    }

    const maybeCode = (error as { code?: unknown }).code
    const maybeMessage = (error as { message?: unknown }).message

    return (
        maybeCode === 'permission-denied' ||
        (typeof maybeMessage === 'string' &&
            maybeMessage.toLowerCase().includes('insufficient permissions'))
    )
}

export const listUserActiveExercises = async (uid: string): Promise<Exercise[]> => {
    return listExercisesByArchiveState(uid, false)
}

export const listMergedActiveExercises = async (
    uid: string,
): Promise<Exercise[]> => {
    const userExercises = await listUserActiveExercises(uid)
    let globalExercises: Exercise[] = []

    try {
        globalExercises = await listGlobalExercises()
    } catch (error) {
        if (!isPermissionDeniedError(error)) {
            throw error
        }
        // Rules for global_exercises might not be deployed yet in some envs.
        globalExercises = []
    }

    return sortMergedExercises([...globalExercises, ...userExercises])
}

export const listActiveExercises = async (uid: string): Promise<Exercise[]> => {
    return listMergedActiveExercises(uid)
}

export const listArchivedExercises = async (uid: string): Promise<Exercise[]> => {
    return listExercisesByArchiveState(uid, true)
}

export const createExercise = async (
    uid: string,
    input: ExerciseInput,
): Promise<string> => {
    const normalized = normalizeExerciseInput(input)
    const exercisesRef = fitnessCollections.exercises<ExerciseFirestoreDocument>(uid)

    const docRef = await addDoc(exercisesRef, {
        ...normalized,
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: EXERCISE_SCHEMA_VERSION,
    })

    return docRef.id
}

export const updateExercise = async (
    uid: string,
    exerciseId: string,
    input: ExerciseInput,
): Promise<void> => {
    const normalized = normalizeExerciseInput(input)
    const exerciseRef = doc(
        fitnessCollections.exercises<ExerciseFirestoreDocument>(uid),
        exerciseId,
    )

    await updateDoc(exerciseRef, {
        ...normalized,
        updatedAt: serverTimestamp(),
        schemaVersion: EXERCISE_SCHEMA_VERSION,
    })
}

export const setExerciseArchivedState = async (
    uid: string,
    exerciseId: string,
    isArchived: boolean,
): Promise<void> => {
    const exerciseRef = doc(
        fitnessCollections.exercises<ExerciseFirestoreDocument>(uid),
        exerciseId,
    )

    await updateDoc(exerciseRef, {
        isArchived,
        updatedAt: serverTimestamp(),
    })
}

export const archiveExercise = async (
    uid: string,
    exerciseId: string,
): Promise<void> => {
    await setExerciseArchivedState(uid, exerciseId, true)
}

export const unarchiveExercise = async (
    uid: string,
    exerciseId: string,
): Promise<void> => {
    await setExerciseArchivedState(uid, exerciseId, false)
}
