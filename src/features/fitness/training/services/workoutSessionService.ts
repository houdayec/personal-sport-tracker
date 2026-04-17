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
import type {
    ExerciseSnapshot,
    ExerciseSource,
} from '@/features/fitness/training/types/exercise'
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
    endedAt?: any
    completedAt?: any
    updatedAt?: any
    createdAt?: any
}) => {
    return (
        session.startedAt?.toMillis?.() ??
        session.endedAt?.toMillis?.() ??
        session.completedAt?.toMillis?.() ??
        session.updatedAt?.toMillis?.() ??
        session.createdAt?.toMillis?.() ??
        0
    )
}

const sortSessionsByDateDesc = <T extends {
    startedAt?: any
    endedAt?: any
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

const normalizeExerciseSource = (
    value: unknown,
    fallback: ExerciseSource = 'user',
): ExerciseSource => {
    return value === 'global' || value === 'user' ? value : fallback
}

const normalizeString = (value: unknown): string => {
    return typeof value === 'string' ? value.trim() : ''
}

const buildExerciseSnapshot = (record: Record<string, unknown>): ExerciseSnapshot => {
    const rawSnapshot =
        typeof record.exerciseSnapshot === 'object' && record.exerciseSnapshot
            ? (record.exerciseSnapshot as Record<string, unknown>)
            : null

    const name = normalizeString(rawSnapshot?.name ?? record.name)
    const muscleGroup = normalizeString(rawSnapshot?.muscleGroup ?? record.muscleGroup)
    const equipment = normalizeString(rawSnapshot?.equipment ?? record.equipment)

    return {
        name,
        muscleGroup,
        equipment,
    }
}

const getExerciseRefKey = (source: ExerciseSource, exerciseId: string) => {
    return `${source}:${exerciseId}`
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

    const setNumber =
        typeof record.setNumber === 'number'
            ? record.setNumber
            : index + 1
    const targetRepsRaw =
        typeof record.targetReps === 'string'
            ? record.targetReps
            : typeof record.reps === 'string'
              ? record.reps
              : ''
    const targetWeightRaw =
        typeof record.targetWeight === 'string'
            ? record.targetWeight
            : typeof record.weight === 'string'
              ? record.weight
              : ''

    const targetReps = targetRepsRaw.trim()
    const targetWeight = targetWeightRaw.trim()

    return {
        setNumber,
        ...(targetReps ? { targetReps } : {}),
        ...(targetWeight ? { targetWeight } : {}),
    }
}

const toFirestoreTemplateSet = (
    set: TemplateWorkoutSet,
    index: number,
): TemplateWorkoutSet => {
    const setNumber = Number.isFinite(set.setNumber) ? set.setNumber : index + 1
    const targetReps = (set.targetReps || '').trim()
    const targetWeight = (set.targetWeight || '').trim()

    return {
        setNumber,
        ...(targetReps ? { targetReps } : {}),
        ...(targetWeight ? { targetWeight } : {}),
    }
}

const normalizeTemplateExercise = (
    exercise: unknown,
    index: number,
): WorkoutTemplateExercise => {
    if (typeof exercise !== 'object' || !exercise) {
        return {
            name: `Exercice ${index + 1}`,
            exerciseSource: 'user',
            exerciseId: null,
            exerciseSnapshot: {
                name: `Exercice ${index + 1}`,
                muscleGroup: '',
                equipment: '',
            },
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

    const exerciseId =
        typeof record.exerciseId === 'string'
            ? record.exerciseId
            : typeof record.id === 'string'
              ? record.id
              : null

    const snapshot = buildExerciseSnapshot(record)
    const fallbackName = `Exercice ${index + 1}`
    const name = snapshot.name || fallbackName
    const muscleGroup = snapshot.muscleGroup
    const equipment = snapshot.equipment

    return {
        name,
        exerciseSource: normalizeExerciseSource(record.exerciseSource),
        exerciseId,
        exerciseSnapshot: {
            name,
            muscleGroup,
            equipment,
        },
        muscleGroup,
        equipment,
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
        schemaVersion: data.schemaVersion ?? WORKOUT_TEMPLATE_SCHEMA_VERSION,
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

        const muscleGroup = exercise.muscleGroup?.trim() || ''
        const equipment = exercise.equipment?.trim() || ''
        const exerciseId = exercise.exerciseId || null
        const exerciseSource = normalizeExerciseSource(
            exercise.exerciseSource,
            'user',
        )
        const exerciseSnapshot = {
            name: exerciseName,
            muscleGroup,
            equipment,
        }

        return {
            exerciseSource,
            exerciseId,
            exerciseSnapshot,
            name: exerciseName,
            muscleGroup,
            equipment,
            plannedSets: exercise.plannedSets.map((set, setIndex) =>
                toFirestoreTemplateSet(
                    {
                        ...set,
                        setNumber: setIndex + 1,
                    },
                    setIndex,
                ),
            ),
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
    const snapshot = buildExerciseSnapshot(record)
    const recordName =
        typeof record.name === 'string' ? record.name.trim() : ''
    const name = recordName || snapshot.name || plannedExercise.name

    return {
        plannedExerciseId: plannedExercise.plannedExerciseId,
        exerciseSource: normalizeExerciseSource(
            record.exerciseSource,
            plannedExercise.exerciseSource,
        ),
        exerciseId:
            typeof record.exerciseId === 'string'
                ? record.exerciseId
                : plannedExercise.exerciseId,
        exerciseSnapshot: {
            name,
            muscleGroup: snapshot.muscleGroup || plannedExercise.muscleGroup,
            equipment: snapshot.equipment || plannedExercise.equipment,
        },
        name,
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

const normalizePlannedExercise = (
    exercise: unknown,
    index: number,
): PlannedWorkoutExercise => {
    const normalized = normalizeTemplateExercise(exercise, index)
    const plannedExerciseId =
        typeof exercise === 'object' &&
        exercise &&
        typeof (exercise as Record<string, unknown>).plannedExerciseId === 'string'
            ? ((exercise as Record<string, unknown>).plannedExerciseId as string)
            : `planned_${index + 1}_${sanitizeKey(normalized.exerciseId || normalized.name)}`

    const orderIndex =
        typeof exercise === 'object' &&
        exercise &&
        typeof (exercise as Record<string, unknown>).orderIndex === 'number'
            ? ((exercise as Record<string, unknown>).orderIndex as number)
            : index

    return {
        plannedExerciseId,
        exerciseSource: normalizeExerciseSource(normalized.exerciseSource, 'user'),
        exerciseId: normalized.exerciseId || null,
        exerciseSnapshot: normalized.exerciseSnapshot || {
            name: normalized.name,
            muscleGroup: normalized.muscleGroup || '',
            equipment: normalized.equipment || '',
        },
        name: normalized.name,
        muscleGroup: normalized.muscleGroup || '',
        equipment: normalized.equipment || '',
        orderIndex,
        plannedSets: normalized.plannedSets,
    }
}

const sessionFromSnapshot = (
    snapshot: QueryDocumentSnapshot<WorkoutSessionDocument>,
): WorkoutSession => {
    const data = snapshot.data()

    const plannedExercises = Array.isArray(data.plannedExercises)
        ? data.plannedExercises.map(normalizePlannedExercise)
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

    const sourceTemplate =
        data.sourceTemplate &&
        typeof data.sourceTemplate === 'object' &&
        typeof data.sourceTemplate.id === 'string' &&
        typeof data.sourceTemplate.name === 'string'
            ? {
                  id: data.sourceTemplate.id,
                  name: data.sourceTemplate.name,
                  version:
                      typeof data.sourceTemplate.version === 'number'
                          ? data.sourceTemplate.version
                          : WORKOUT_TEMPLATE_SCHEMA_VERSION,
              }
            : data.templateId && data.templateName
              ? {
                    id: data.templateId,
                    name: data.templateName,
                    version: WORKOUT_TEMPLATE_SCHEMA_VERSION,
                }
              : null

    return {
        id: snapshot.id,
        status: data.status,
        startedAt: data.startedAt ?? null,
        endedAt: data.endedAt ?? data.completedAt ?? null,
        completedAt: data.completedAt ?? null,
        plannedExercises,
        performedExercises: normalizedPerformed,
        performedExerciseIds: performedIds,
        sourceTemplate,
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
        const exerciseSource = normalizeExerciseSource(
            exercise.exerciseSource,
            'user',
        )
        const exerciseSnapshot = exercise.exerciseSnapshot || {
            name: exercise.name,
            muscleGroup: exercise.muscleGroup || '',
            equipment: exercise.equipment || '',
        }

        return {
            plannedExerciseId: `planned_${index + 1}_${sanitizeKey(baseId)}`,
            exerciseSource,
            exerciseId: exercise.exerciseId || null,
            exerciseSnapshot,
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
            exerciseSource: normalizeExerciseSource(exercise.exerciseSource, 'user'),
            exerciseId: exercise.exerciseId || null,
            exerciseSnapshot: exercise.exerciseSnapshot || {
                name: exercise.name,
                muscleGroup: exercise.muscleGroup || '',
                equipment: exercise.equipment || '',
            },
            name: exercise.name,
            muscleGroup: exercise.muscleGroup || '',
            equipment: exercise.equipment || '',
            plannedSets: exercise.plannedSets.map((set, setIndex) =>
                toFirestoreTemplateSet(
                    {
                        ...set,
                        setNumber: setIndex + 1,
                    },
                    setIndex,
                ),
            ),
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
        endedAt: null,
        completedAt: null,
        plannedExercises,
        performedExercises: {},
        performedExerciseIds: [],
        sourceTemplate: {
            id: template.id,
            name: template.name,
            version: template.schemaVersion ?? WORKOUT_TEMPLATE_SCHEMA_VERSION,
        },
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
        exerciseSource: input.exerciseSource,
        exerciseId: input.exerciseId,
        exerciseSnapshot: input.exerciseSnapshot,
        name: input.name,
        status,
        sets: input.sets,
        notes: input.notes,
    }

    const trackedIds = [
        input.plannedExerciseId,
        input.exerciseId
            ? getExerciseRefKey(input.exerciseSource, input.exerciseId)
            : undefined,
        input.exerciseId || undefined,
    ].filter((value): value is string => Boolean(value))

    const payload: Record<string, unknown> = {
        [`performedExercises.${input.plannedExerciseId}`]: nextPerformed,
        performedExerciseIds: arrayUnion(...trackedIds),
        updatedAt: serverTimestamp(),
    }

    await updateDoc(sessionRef, payload)
}

export const markExerciseCompleted = async (
    uid: string,
    sessionId: string,
    input: SavePerformedExerciseInput | string,
): Promise<void> => {
    if (typeof input === 'string') {
        const currentSession = await getWorkoutSessionById(uid, sessionId)
        const existingPerformed = currentSession.performedExercises[input]
        const plannedExercise = currentSession.plannedExercises.find(
            (exercise) => exercise.plannedExerciseId === input,
        )

        if (!plannedExercise) {
            throw new Error('Exercice introuvable dans la séance.')
        }

        await updatePerformedExercise(uid, sessionId, {
            plannedExerciseId: plannedExercise.plannedExerciseId,
            exerciseSource: plannedExercise.exerciseSource,
            exerciseId: plannedExercise.exerciseId,
            exerciseSnapshot: plannedExercise.exerciseSnapshot,
            name: plannedExercise.name,
            sets: existingPerformed?.sets || [],
            notes: existingPerformed?.notes || '',
            status: 'completed',
        })
        return
    }

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
        endedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}

// Aliases aligned with product naming
export const createWorkoutSessionFromTemplate = startWorkoutSessionFromTemplate
export const getCurrentWorkoutSession = getInProgressWorkoutSession
export const finishWorkoutSession = completeWorkoutSession
