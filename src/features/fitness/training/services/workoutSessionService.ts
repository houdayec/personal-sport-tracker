import {
    addDoc,
    arrayUnion,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { fitnessCollections } from '@/features/fitness/common/services'
import {
    WORKOUT_SESSION_SCHEMA_VERSION,
    WORKOUT_TEMPLATE_SCHEMA_VERSION,
    type PerformedWorkoutExercise,
    type PlannedWorkoutExercise,
    type SavePerformedExerciseInput,
    type TemplateWorkoutSet,
    type WorkoutSession,
    type WorkoutSessionDocument,
    type WorkoutTemplate,
    type WorkoutTemplateDocument,
    type WorkoutTemplateExercise,
    type WorkoutTemplateInput,
} from '@/features/fitness/training/types/workoutSession'

const getSessionSortTime = (session: {
    startedAt?: any
    completedAt?: any
    updatedAt?: any
    createdAt?: any
}) => {
    return (
        session.startedAt?.toMillis?.() ??
        session.completedAt?.toMillis?.() ??
        session.updatedAt?.toMillis?.() ??
        session.createdAt?.toMillis?.() ??
        0
    )
}

const sortSessionsByDateDesc = <T extends {
    startedAt?: any
    completedAt?: any
    updatedAt?: any
    createdAt?: any
}>(
    sessions: T[],
): T[] => {
    return [...sessions].sort((a, b) => getSessionSortTime(b) - getSessionSortTime(a))
}

const sortByMostRecent = <T extends { updatedAt?: any; createdAt?: any }>(
    items: T[],
): T[] => {
    return [...items].sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0
        const bTime = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0
        return bTime - aTime
    })
}

const normalizeTemplateTags = (tags: unknown): string[] => {
    if (!Array.isArray(tags)) {
        return []
    }

    return Array.from(
        new Set(
            tags
                .filter((tag) => typeof tag === 'string')
                .map((tag) => tag.trim())
                .filter(Boolean)
                .slice(0, 12),
        ),
    )
}

const normalizeTemplateSet = (set: unknown, index: number): TemplateWorkoutSet => {
    if (typeof set !== 'object' || !set) {
        return {
            setNumber: index + 1,
        }
    }

    const record = set as Record<string, unknown>

    return {
        setNumber:
            typeof record.setNumber === 'number'
                ? record.setNumber
                : index + 1,
        targetReps:
            typeof record.targetReps === 'string'
                ? record.targetReps
                : typeof record.reps === 'string'
                  ? record.reps
                  : undefined,
        targetWeight:
            typeof record.targetWeight === 'string'
                ? record.targetWeight
                : typeof record.weight === 'string'
                  ? record.weight
                  : undefined,
    }
}

const normalizeTemplateExercise = (
    exercise: unknown,
    index: number,
): WorkoutTemplateExercise => {
    if (typeof exercise !== 'object' || !exercise) {
        return {
            name: `Exercice ${index + 1}`,
            exerciseId: null,
            muscleGroup: '',
            equipment: '',
            plannedSets: [],
        }
    }

    const record = exercise as Record<string, unknown>

    const rawSets = Array.isArray(record.plannedSets)
        ? record.plannedSets
        : Array.isArray(record.sets)
          ? record.sets
          : []

    return {
        name:
            typeof record.name === 'string' && record.name.trim()
                ? record.name.trim()
                : `Exercice ${index + 1}`,
        exerciseId:
            typeof record.exerciseId === 'string'
                ? record.exerciseId
                : typeof record.id === 'string'
                  ? record.id
                  : null,
        muscleGroup:
            typeof record.muscleGroup === 'string' ? record.muscleGroup : '',
        equipment: typeof record.equipment === 'string' ? record.equipment : '',
        plannedSets: rawSets.map(normalizeTemplateSet),
    }
}

const templateFromSnapshot = (
    snapshot: QueryDocumentSnapshot<WorkoutTemplateDocument>,
): WorkoutTemplate => {
    const data = snapshot.data()

    return {
        id: snapshot.id,
        name:
            typeof data.name === 'string' && data.name.trim()
                ? data.name.trim()
                : 'Template sans nom',
        tags: normalizeTemplateTags(data.tags),
        exercises: Array.isArray(data.exercises)
            ? data.exercises.map(normalizeTemplateExercise)
            : [],
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    }
}

const normalizeTemplateInput = (
    input: WorkoutTemplateInput,
): WorkoutTemplateInput => {
    const name = input.name.trim()

    if (!name) {
        throw new Error('Le nom du template est requis.')
    }

    if (!Array.isArray(input.exercises) || input.exercises.length === 0) {
        throw new Error('Le template doit contenir au moins un exercice.')
    }

    const exercises = input.exercises.map((exercise, exerciseIndex) => {
        const exerciseName = exercise.name.trim()

        if (!exerciseName) {
            throw new Error(
                `Le nom de l’exercice ${exerciseIndex + 1} est requis.`,
            )
        }

        if (!Array.isArray(exercise.plannedSets) || exercise.plannedSets.length === 0) {
            throw new Error(`L’exercice "${exerciseName}" doit contenir au moins un set.`)
        }

        return {
            exerciseId: exercise.exerciseId || null,
            name: exerciseName,
            muscleGroup: exercise.muscleGroup?.trim() || '',
            equipment: exercise.equipment?.trim() || '',
            plannedSets: exercise.plannedSets.map((set, setIndex) => ({
                setNumber: setIndex + 1,
                targetReps: set.targetReps?.trim() || undefined,
                targetWeight: set.targetWeight?.trim() || undefined,
            })),
        }
    })

    return {
        name,
        tags: normalizeTemplateTags(input.tags),
        exercises,
    }
}

const normalizePerformedExercise = (
    plannedExercise: PlannedWorkoutExercise,
    value: unknown,
): PerformedWorkoutExercise | null => {
    if (typeof value !== 'object' || !value) {
        return null
    }

    const record = value as Record<string, unknown>
    const rawSets = Array.isArray(record.sets) ? record.sets : []

    return {
        plannedExerciseId: plannedExercise.plannedExerciseId,
        exerciseId:
            typeof record.exerciseId === 'string'
                ? record.exerciseId
                : plannedExercise.exerciseId,
        name:
            typeof record.name === 'string' && record.name.trim()
                ? record.name
                : plannedExercise.name,
        status:
            record.status === 'completed' ? 'completed' : 'in_progress',
        sets: rawSets
            .map((set, index) => {
                if (typeof set !== 'object' || !set) {
                    return {
                        setNumber: index + 1,
                        reps: '',
                        weight: '',
                        notes: '',
                    }
                }

                const setRecord = set as Record<string, unknown>

                return {
                    setNumber:
                        typeof setRecord.setNumber === 'number'
                            ? setRecord.setNumber
                            : index + 1,
                    reps:
                        typeof setRecord.reps === 'string'
                            ? setRecord.reps
                            : '',
                    weight:
                        typeof setRecord.weight === 'string'
                            ? setRecord.weight
                            : '',
                    notes:
                        typeof setRecord.notes === 'string'
                            ? setRecord.notes
                            : '',
                }
            })
            .filter((set) => set.reps || set.weight || set.notes),
        notes: typeof record.notes === 'string' ? record.notes : '',
    }
}

const sessionFromSnapshot = (
    snapshot: QueryDocumentSnapshot<WorkoutSessionDocument>,
): WorkoutSession => {
    const data = snapshot.data()

    const plannedExercises = Array.isArray(data.plannedExercises)
        ? data.plannedExercises
        : []

    const performedMap =
        data.performedExercises && typeof data.performedExercises === 'object'
            ? data.performedExercises
            : {}

    const normalizedPerformed = plannedExercises.reduce<
        Record<string, PerformedWorkoutExercise>
    >((acc, planned) => {
        const value = normalizePerformedExercise(
            planned,
            (performedMap as Record<string, unknown>)[planned.plannedExerciseId],
        )

        if (value) {
            acc[planned.plannedExerciseId] = value
        }

        return acc
    }, {})

    const performedIds = Array.isArray(data.performedExerciseIds)
        ? data.performedExerciseIds.filter((id) => typeof id === 'string')
        : []

    return {
        id: snapshot.id,
        status: data.status,
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
        plannedExercises,
        performedExercises: normalizedPerformed,
        performedExerciseIds: performedIds,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        schemaVersion: data.schemaVersion ?? WORKOUT_SESSION_SCHEMA_VERSION,
        templateId: data.templateId,
        templateName: data.templateName,
    }
}

const sanitizeKey = (value: string): string => {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export const convertTemplateToPlannedExercises = (
    template: WorkoutTemplate,
): PlannedWorkoutExercise[] => {
    return template.exercises.map((exercise, index) => {
        const baseId = exercise.exerciseId || `exercise_${index + 1}`

        return {
            plannedExerciseId: `planned_${index + 1}_${sanitizeKey(baseId)}`,
            exerciseId: exercise.exerciseId || null,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup || '',
            equipment: exercise.equipment || '',
            orderIndex: index,
            plannedSets: exercise.plannedSets,
        }
    })
}

const ensureTemplateExists = async (
    uid: string,
    templateId: string,
): Promise<WorkoutTemplate> => {
    const templateRef = doc(
        fitnessCollections.workoutTemplates<WorkoutTemplateDocument>(uid),
        templateId,
    )
    const templateSnapshot = await getDoc(templateRef)

    if (!templateSnapshot.exists()) {
        throw new Error('Template introuvable.')
    }

    const template = templateFromSnapshot(
        templateSnapshot as QueryDocumentSnapshot<WorkoutTemplateDocument>,
    )

    if (!template.exercises.length) {
        throw new Error('Ce template ne contient aucun exercice.')
    }

    return template
}

export const listWorkoutTemplates = async (
    uid: string,
): Promise<WorkoutTemplate[]> => {
    const templatesRef = fitnessCollections.workoutTemplates<WorkoutTemplateDocument>(uid)
    const snapshot = await getDocs(templatesRef)

    return sortByMostRecent(snapshot.docs.map(templateFromSnapshot))
}

export const getWorkoutTemplateById = async (
    uid: string,
    templateId: string,
): Promise<WorkoutTemplate> => {
    return ensureTemplateExists(uid, templateId)
}

export const createWorkoutTemplate = async (
    uid: string,
    input: WorkoutTemplateInput,
): Promise<string> => {
    const normalized = normalizeTemplateInput(input)
    const templatesRef = fitnessCollections.workoutTemplates<WorkoutTemplateDocument>(uid)

    const templateRef = await addDoc(templatesRef, {
        name: normalized.name,
        tags: normalized.tags,
        exercises: normalized.exercises,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: WORKOUT_TEMPLATE_SCHEMA_VERSION,
    })

    return templateRef.id
}

export const updateWorkoutTemplate = async (
    uid: string,
    templateId: string,
    input: WorkoutTemplateInput,
): Promise<void> => {
    const normalized = normalizeTemplateInput(input)
    const templateRef = doc(
        fitnessCollections.workoutTemplates<WorkoutTemplateDocument>(uid),
        templateId,
    )

    await updateDoc(templateRef, {
        name: normalized.name,
        tags: normalized.tags,
        exercises: normalized.exercises,
        updatedAt: serverTimestamp(),
        schemaVersion: WORKOUT_TEMPLATE_SCHEMA_VERSION,
    })
}

export const deleteWorkoutTemplate = async (
    uid: string,
    templateId: string,
): Promise<void> => {
    const templateRef = doc(
        fitnessCollections.workoutTemplates<WorkoutTemplateDocument>(uid),
        templateId,
    )

    await deleteDoc(templateRef)
}

export const duplicateWorkoutTemplate = async (
    uid: string,
    templateId: string,
): Promise<string> => {
    const source = await ensureTemplateExists(uid, templateId)
    const templatesRef = fitnessCollections.workoutTemplates<WorkoutTemplateDocument>(uid)

    const duplicatedTemplate = await addDoc(templatesRef, {
        name: `${source.name} (copie)`,
        tags: source.tags || [],
        exercises: source.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId || null,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup || '',
            equipment: exercise.equipment || '',
            plannedSets: exercise.plannedSets.map((set, setIndex) => ({
                setNumber: setIndex + 1,
                targetReps: set.targetReps,
                targetWeight: set.targetWeight,
            })),
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: WORKOUT_TEMPLATE_SCHEMA_VERSION,
    })

    return duplicatedTemplate.id
}

export const listWorkoutSessionsHistory = async (
    uid: string,
): Promise<WorkoutSession[]> => {
    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)
    const snapshot = await getDocs(sessionsRef)

    const sessions = snapshot.docs.map(sessionFromSnapshot)

    return sortSessionsByDateDesc(sessions)
}

export const getWorkoutSessionById = async (
    uid: string,
    sessionId: string,
): Promise<WorkoutSession> => {
    const sessionRef = doc(
        fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid),
        sessionId,
    )
    const snapshot = await getDoc(sessionRef)

    if (!snapshot.exists()) {
        throw new Error('Séance introuvable.')
    }

    return sessionFromSnapshot(
        snapshot as QueryDocumentSnapshot<WorkoutSessionDocument>,
    )
}

export const getInProgressWorkoutSession = async (
    uid: string,
): Promise<WorkoutSession | null> => {
    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)
    const inProgressQuery = query(sessionsRef, where('status', '==', 'in_progress'))
    const snapshot = await getDocs(inProgressQuery)

    if (!snapshot.docs.length) {
        return null
    }

    const sessions = snapshot.docs.map(sessionFromSnapshot)
    const sortedSessions = sortSessionsByDateDesc(sessions)

    return sortedSessions[0] || null
}

export const startWorkoutSessionFromTemplate = async (
    uid: string,
    templateId: string,
): Promise<WorkoutSession> => {
    const existingInProgressSession = await getInProgressWorkoutSession(uid)

    if (existingInProgressSession) {
        return existingInProgressSession
    }

    const template = await ensureTemplateExists(uid, templateId)
    const plannedExercises = convertTemplateToPlannedExercises(template)

    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)

    const sessionDocRef = await addDoc(sessionsRef, {
        status: 'in_progress',
        startedAt: serverTimestamp(),
        completedAt: null,
        plannedExercises,
        performedExercises: {},
        performedExerciseIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: WORKOUT_SESSION_SCHEMA_VERSION,
        templateId: template.id,
        templateName: template.name,
    })

    return getWorkoutSessionById(uid, sessionDocRef.id)
}

export const updatePerformedExercise = async (
    uid: string,
    sessionId: string,
    input: SavePerformedExerciseInput,
): Promise<void> => {
    const sessionRef = doc(
        fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid),
        sessionId,
    )

    const status = input.status || 'in_progress'

    const nextPerformed: PerformedWorkoutExercise = {
        plannedExerciseId: input.plannedExerciseId,
        exerciseId: input.exerciseId,
        name: input.name,
        status,
        sets: input.sets,
        notes: input.notes,
    }

    const payload: Record<string, unknown> = {
        [`performedExercises.${input.plannedExerciseId}`]: nextPerformed,
        performedExerciseIds: arrayUnion(input.plannedExerciseId),
        updatedAt: serverTimestamp(),
    }

    await updateDoc(sessionRef, payload)
}

export const markExerciseCompleted = async (
    uid: string,
    sessionId: string,
    input: SavePerformedExerciseInput,
): Promise<void> => {
    await updatePerformedExercise(uid, sessionId, {
        ...input,
        status: 'completed',
    })
}

export const completeWorkoutSession = async (
    uid: string,
    sessionId: string,
): Promise<void> => {
    const sessionRef = doc(
        fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid),
        sessionId,
    )

    await updateDoc(sessionRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}
