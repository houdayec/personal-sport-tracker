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

    const exercises = snapshot.docs.map(exerciseFromSnapshot)

    return sortByUpdatedAtDesc(exercises)
}

export const listActiveExercises = async (uid: string): Promise<Exercise[]> => {
    return listExercisesByArchiveState(uid, false)
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
