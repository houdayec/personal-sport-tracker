import {
    collection,
    doc,
    type CollectionReference,
    type DocumentData,
    type DocumentReference,
} from 'firebase/firestore'
import { db } from '@/firebase'

export const USERS_COLLECTION = 'users' as const
export const GLOBAL_EXERCISES_COLLECTION = 'global_exercises' as const
export const GLOBAL_RUNNING_TYPES_COLLECTION = 'global_running_types' as const

export const FITNESS_USER_SUBCOLLECTIONS = {
    exercises: 'exercises',
    workoutTemplates: 'workout_templates',
    workoutSessions: 'workout_sessions',
    bodyWeightEntries: 'body_weight_entries',
    bodyMeasurementEntries: 'body_measurement_entries',
    bodyCheckins: 'body_checkins',
} as const

export type FitnessUserSubcollectionName =
    (typeof FITNESS_USER_SUBCOLLECTIONS)[keyof typeof FITNESS_USER_SUBCOLLECTIONS]

const assertUid = (uid: string) => {
    if (!uid || !uid.trim()) {
        throw new Error('Un uid valide est requis pour accéder aux données utilisateur.')
    }
}

export const userDocumentRef = (uid: string): DocumentReference<DocumentData> => {
    assertUid(uid)
    return doc(db, USERS_COLLECTION, uid)
}

export const userCollectionPath = (
    uid: string,
    subcollection: FitnessUserSubcollectionName,
) => {
    assertUid(uid)
    return `${USERS_COLLECTION}/${uid}/${subcollection}`
}

export const userSubcollectionRef = <T extends DocumentData = DocumentData>(
    uid: string,
    subcollection: FitnessUserSubcollectionName,
): CollectionReference<T> => {
    assertUid(uid)
    return collection(db, USERS_COLLECTION, uid, subcollection) as CollectionReference<T>
}

export const globalExercisesCollectionRef = <
    T extends DocumentData = DocumentData,
>(): CollectionReference<T> => {
    return collection(db, GLOBAL_EXERCISES_COLLECTION) as CollectionReference<T>
}

export const globalRunningTypesCollectionRef = <
    T extends DocumentData = DocumentData,
>(): CollectionReference<T> => {
    return collection(db, GLOBAL_RUNNING_TYPES_COLLECTION) as CollectionReference<T>
}

export const fitnessCollections = {
    globalExercises: <T extends DocumentData = DocumentData>() =>
        globalExercisesCollectionRef<T>(),
    globalRunningTypes: <T extends DocumentData = DocumentData>() =>
        globalRunningTypesCollectionRef<T>(),
    exercises: <T extends DocumentData = DocumentData>(uid: string) =>
        userSubcollectionRef<T>(uid, FITNESS_USER_SUBCOLLECTIONS.exercises),
    workoutTemplates: <T extends DocumentData = DocumentData>(uid: string) =>
        userSubcollectionRef<T>(uid, FITNESS_USER_SUBCOLLECTIONS.workoutTemplates),
    workoutSessions: <T extends DocumentData = DocumentData>(uid: string) =>
        userSubcollectionRef<T>(uid, FITNESS_USER_SUBCOLLECTIONS.workoutSessions),
    bodyWeightEntries: <T extends DocumentData = DocumentData>(uid: string) =>
        userSubcollectionRef<T>(uid, FITNESS_USER_SUBCOLLECTIONS.bodyWeightEntries),
    bodyMeasurementEntries: <T extends DocumentData = DocumentData>(uid: string) =>
        userSubcollectionRef<T>(uid, FITNESS_USER_SUBCOLLECTIONS.bodyMeasurementEntries),
    bodyCheckins: <T extends DocumentData = DocumentData>(uid: string) =>
        userSubcollectionRef<T>(uid, FITNESS_USER_SUBCOLLECTIONS.bodyCheckins),
}
