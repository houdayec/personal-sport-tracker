import {
    Timestamp,
    addDoc,
    arrayUnion,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getDocsFromServer,
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
import { isCardioNoSetsExercise } from '@/features/fitness/training/utils/exerciseKind'
import {
    WORKOUT_SESSION_SCHEMA_VERSION,
    WORKOUT_TEMPLATE_SCHEMA_VERSION,
    type BreathingSessionData,
    type CreatePastWorkoutSessionInput,
    type CreateBreathingSessionInput,
    type HiitSessionData,
    type HiitTemplateConfig,
    type RunningGpxData,
    type RunningGpxTrackPoint,
    type RunningSessionData,
    type RunningTemplateConfig,
    type SessionType,
    type UpdateBreathingSessionInput,
    type StrengthSessionData,
    type StrengthTemplateConfig,
    type UpdateHiitSessionInput,
    type UpdateRunningSessionInput,
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
import { normalizeRunningTypeValue } from '@/features/fitness/training/utils/runningType'

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

const normalizeSessionType = (
    value: unknown,
    fallback: SessionType = 'strength',
): SessionType => {
    return value === 'strength' ||
        value === 'hiit' ||
        value === 'running' ||
        value === 'breathing'
        ? value
        : fallback
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

const normalizeStrengthTemplateConfig = (
    record: Record<string, unknown>,
): StrengthTemplateConfig => {
    const rawConfig =
        record.strengthConfig && typeof record.strengthConfig === 'object'
            ? (record.strengthConfig as Record<string, unknown>)
            : {}
    const rawExercises = Array.isArray(rawConfig.exercises)
        ? rawConfig.exercises
        : Array.isArray(record.exercises)
          ? record.exercises
          : []

    return {
        exercises: rawExercises.map(normalizeTemplateExercise),
    }
}

const toPositiveNumber = (value: unknown, fallback: number): number => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return fallback
    }
    return value
}

const toOptionalPositiveNumber = (value: unknown): number | undefined => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return undefined
    }
    return value
}

const roundNumber = (value: number, decimals: number): number => {
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
}

const MAX_GPX_TRACK_POINTS = 1200

const normalizeGpxPoint = (
    value: unknown,
): RunningGpxTrackPoint | null => {
    if (!value || typeof value !== 'object') {
        return null
    }

    const record = value as Record<string, unknown>
    const lat = typeof record.lat === 'number' && Number.isFinite(record.lat) ? record.lat : null
    const lon = typeof record.lon === 'number' && Number.isFinite(record.lon) ? record.lon : null
    const distanceKm =
        typeof record.distanceKm === 'number' && Number.isFinite(record.distanceKm)
            ? Math.max(0, record.distanceKm)
            : null
    const elapsedSec =
        typeof record.elapsedSec === 'number' && Number.isFinite(record.elapsedSec)
            ? Math.max(0, record.elapsedSec)
            : null

    if (
        lat === null ||
        lon === null ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180 ||
        distanceKm === null ||
        elapsedSec === null
    ) {
        return null
    }

    const eleM =
        typeof record.eleM === 'number' && Number.isFinite(record.eleM)
            ? roundNumber(record.eleM, 1)
            : undefined
    const timeMs =
        typeof record.timeMs === 'number' &&
        Number.isFinite(record.timeMs) &&
        record.timeMs > 0
            ? Math.round(record.timeMs)
            : undefined

    return {
        lat: roundNumber(lat, 6),
        lon: roundNumber(lon, 6),
        distanceKm: roundNumber(distanceKm, 3),
        elapsedSec: Math.round(elapsedSec),
        ...(typeof eleM === 'number' ? { eleM } : {}),
        ...(typeof timeMs === 'number' ? { timeMs } : {}),
    }
}

const normalizeRunningGpxData = (value: unknown): RunningGpxData | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined
    }

    const record = value as Record<string, unknown>
    const fileName =
        typeof record.fileName === 'string' && record.fileName.trim()
            ? record.fileName.trim()
            : 'trace.gpx'
    const uploadedAtMs =
        typeof record.uploadedAtMs === 'number' &&
        Number.isFinite(record.uploadedAtMs) &&
        record.uploadedAtMs > 0
            ? Math.round(record.uploadedAtMs)
            : Date.now()

    const rawPoints = Array.isArray(record.points) ? record.points : []
    const points = rawPoints
        .map(normalizeGpxPoint)
        .filter((point): point is RunningGpxTrackPoint => Boolean(point))
        .slice(0, MAX_GPX_TRACK_POINTS)

    if (!points.length) {
        return undefined
    }

    const summaryRaw =
        record.summary && typeof record.summary === 'object'
            ? (record.summary as Record<string, unknown>)
            : {}

    const lastPoint = points[points.length - 1]
    const distanceKm =
        typeof summaryRaw.distanceKm === 'number' &&
        Number.isFinite(summaryRaw.distanceKm) &&
        summaryRaw.distanceKm >= 0
            ? roundNumber(summaryRaw.distanceKm, 3)
            : lastPoint.distanceKm
    const durationSec =
        typeof summaryRaw.durationSec === 'number' &&
        Number.isFinite(summaryRaw.durationSec) &&
        summaryRaw.durationSec >= 0
            ? Math.round(summaryRaw.durationSec)
            : lastPoint.elapsedSec

    const avgPaceSecPerKm =
        typeof summaryRaw.avgPaceSecPerKm === 'number' &&
        Number.isFinite(summaryRaw.avgPaceSecPerKm) &&
        summaryRaw.avgPaceSecPerKm > 0
            ? roundNumber(summaryRaw.avgPaceSecPerKm, 1)
            : distanceKm > 0 && durationSec > 0
              ? roundNumber(durationSec / distanceKm, 1)
              : undefined

    const toOptionalNonNegative = (input: unknown, decimals = 1) => {
        if (typeof input !== 'number' || !Number.isFinite(input) || input < 0) {
            return undefined
        }
        return roundNumber(input, decimals)
    }

    return {
        fileName,
        uploadedAtMs,
        summary: {
            originalPointCount:
                typeof summaryRaw.originalPointCount === 'number' &&
                Number.isFinite(summaryRaw.originalPointCount) &&
                summaryRaw.originalPointCount >= points.length
                    ? Math.round(summaryRaw.originalPointCount)
                    : points.length,
            storedPointCount: points.length,
            distanceKm,
            durationSec,
            ...(typeof avgPaceSecPerKm === 'number' ? { avgPaceSecPerKm } : {}),
            ...(toOptionalNonNegative(summaryRaw.elevationGainM) !== undefined
                ? { elevationGainM: toOptionalNonNegative(summaryRaw.elevationGainM) }
                : {}),
            ...(toOptionalNonNegative(summaryRaw.elevationLossM) !== undefined
                ? { elevationLossM: toOptionalNonNegative(summaryRaw.elevationLossM) }
                : {}),
            ...(toOptionalNonNegative(summaryRaw.minElevationM) !== undefined
                ? { minElevationM: toOptionalNonNegative(summaryRaw.minElevationM) }
                : {}),
            ...(toOptionalNonNegative(summaryRaw.maxElevationM) !== undefined
                ? { maxElevationM: toOptionalNonNegative(summaryRaw.maxElevationM) }
                : {}),
        },
        points,
    }
}

const normalizeHiitTemplateConfig = (
    record: Record<string, unknown>,
): HiitTemplateConfig => {
    const rawConfig =
        record.hiitConfig && typeof record.hiitConfig === 'object'
            ? (record.hiitConfig as Record<string, unknown>)
            : {}

    const format =
        rawConfig.format === 'circuit' || rawConfig.format === 'interval'
            ? rawConfig.format
            : 'interval'
    const exercises = Array.isArray(rawConfig.exercises)
        ? rawConfig.exercises
              .filter((item) => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
        : []

    return {
        format,
        rounds: toPositiveNumber(rawConfig.rounds, 4),
        workSec: toPositiveNumber(rawConfig.workSec, 40),
        restSec: toPositiveNumber(rawConfig.restSec, 20),
        ...(toOptionalPositiveNumber(rawConfig.restBetweenRoundsSec)
            ? {
                  restBetweenRoundsSec: toOptionalPositiveNumber(
                      rawConfig.restBetweenRoundsSec,
                  ),
              }
            : {}),
        exercises,
    }
}

const normalizeRunningTemplateConfig = (
    record: Record<string, unknown>,
): RunningTemplateConfig => {
    const rawConfig =
        record.runningConfig && typeof record.runningConfig === 'object'
            ? (record.runningConfig as Record<string, unknown>)
            : {}

    const runType = normalizeRunningTypeValue(rawConfig.runType, 'Footing')

    const targetDistanceKm = toOptionalPositiveNumber(rawConfig.targetDistanceKm)
    const targetDurationMin = toOptionalPositiveNumber(rawConfig.targetDurationMin)

    return {
        runType,
        ...(targetDistanceKm ? { targetDistanceKm } : {}),
        ...(targetDurationMin ? { targetDurationMin } : {}),
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
    const record = data as unknown as Record<string, unknown>
    const sessionType = normalizeSessionType(record.sessionType, 'strength')
    const strengthConfig = normalizeStrengthTemplateConfig(record)
    const hiitConfig = normalizeHiitTemplateConfig(record)
    const runningConfig = normalizeRunningTemplateConfig(record)

    return {
        id: snapshot.id,
        name:
            typeof data.name === 'string' && data.name.trim()
                ? data.name.trim()
                : 'Template sans nom',
        sessionType,
        description:
            typeof record.description === 'string' ? record.description.trim() : '',
        isArchived: Boolean(record.isArchived),
        tags: normalizeTemplateTags(data.tags),
        exercises: strengthConfig.exercises,
        strengthConfig,
        hiitConfig,
        runningConfig,
        schemaVersion: data.schemaVersion ?? WORKOUT_TEMPLATE_SCHEMA_VERSION,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    }
}

const normalizeTemplateInput = (
    input: WorkoutTemplateInput,
): WorkoutTemplateInput => {
    const name = input.name.trim()
    const sessionType = normalizeSessionType(input.sessionType, 'strength')
    const description = normalizeString(input.description)
    const isArchived = Boolean(input.isArchived)

    if (!name) {
        throw new Error('Le nom du template est requis.')
    }

    const normalizeStrengthExercises = (
        exercisesInput: WorkoutTemplateExercise[],
    ): WorkoutTemplateExercise[] => {
        if (!Array.isArray(exercisesInput) || exercisesInput.length === 0) {
            throw new Error('Le template doit contenir au moins un exercice.')
        }

        return exercisesInput.map((exercise, exerciseIndex) => {
            const snapshotName = exercise.exerciseSnapshot?.name?.trim() || ''
            const exerciseName = snapshotName || exercise.name.trim()

            if (!exerciseName) {
                throw new Error(
                    `Le nom de l’exercice ${exerciseIndex + 1} est requis.`,
                )
            }

            if (!Array.isArray(exercise.plannedSets) || exercise.plannedSets.length === 0) {
                throw new Error(`L’exercice "${exerciseName}" doit contenir au moins un set.`)
            }

            const muscleGroup =
                exercise.exerciseSnapshot?.muscleGroup?.trim() ||
                exercise.muscleGroup?.trim() ||
                ''
            const equipment =
                exercise.exerciseSnapshot?.equipment?.trim() ||
                exercise.equipment?.trim() ||
                ''
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
    }

    if (sessionType === 'strength') {
        const normalizedStrengthExercises = normalizeStrengthExercises(
            input.strengthConfig?.exercises || input.exercises || [],
        )

        return {
            name,
            tags: normalizeTemplateTags(input.tags),
            sessionType,
            description,
            isArchived,
            exercises: normalizedStrengthExercises,
            strengthConfig: {
                exercises: normalizedStrengthExercises,
            },
            hiitConfig: undefined,
            runningConfig: undefined,
        }
    }

    if (sessionType === 'hiit') {
        const hiitConfig = normalizeHiitTemplateConfig({
            hiitConfig: input.hiitConfig || {},
        })

        if (!hiitConfig.exercises.length) {
            throw new Error('Ajoute au moins un exercice HIIT.')
        }

        return {
            name,
            tags: normalizeTemplateTags(input.tags),
            sessionType,
            description,
            isArchived,
            exercises: [],
            strengthConfig: {
                exercises: [],
            },
            hiitConfig,
            runningConfig: undefined,
        }
    }

    if (sessionType === 'breathing') {
        throw new Error(
            'Les séances respiration se lancent depuis la page Cohérence cardiaque.',
        )
    }

    const runningConfig = normalizeRunningTemplateConfig({
        runningConfig: input.runningConfig || {},
    })

    return {
        name,
        tags: normalizeTemplateTags(input.tags),
        sessionType,
        description,
        isArchived,
        exercises: [],
        strengthConfig: {
            exercises: [],
        },
        hiitConfig: undefined,
        runningConfig,
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

const normalizeStrengthSessionData = (
    record: Record<string, unknown>,
): StrengthSessionData => {
    const rawStrengthData =
        record.strengthData && typeof record.strengthData === 'object'
            ? (record.strengthData as Record<string, unknown>)
            : {}

    const rawPlanned = Array.isArray(rawStrengthData.plannedExercises)
        ? rawStrengthData.plannedExercises
        : Array.isArray(record.plannedExercises)
          ? record.plannedExercises
          : []

    const plannedExercises = rawPlanned.map(normalizePlannedExercise)

    const rawPerformedMap =
        rawStrengthData.performedExercises &&
        typeof rawStrengthData.performedExercises === 'object'
            ? (rawStrengthData.performedExercises as Record<string, unknown>)
            : record.performedExercises && typeof record.performedExercises === 'object'
              ? (record.performedExercises as Record<string, unknown>)
              : {}

    const normalizedPerformed = plannedExercises.reduce<
        Record<string, PerformedWorkoutExercise>
    >((acc, planned) => {
        const value = normalizePerformedExercise(
            planned,
            rawPerformedMap[planned.plannedExerciseId],
        )

        if (value) {
            acc[planned.plannedExerciseId] = value
        }

        return acc
    }, {})

    const rawPerformedIds = Array.isArray(rawStrengthData.performedExerciseIds)
        ? rawStrengthData.performedExerciseIds
        : Array.isArray(record.performedExerciseIds)
          ? record.performedExerciseIds
          : []
    const performedExerciseIds = rawPerformedIds.filter(
        (id): id is string => typeof id === 'string',
    )

    return {
        plannedExercises,
        performedExercises: normalizedPerformed,
        performedExerciseIds,
    }
}

const normalizeHiitSessionData = (
    record: Record<string, unknown>,
): HiitSessionData => {
    const rawHiitData =
        record.hiitData && typeof record.hiitData === 'object'
            ? (record.hiitData as Record<string, unknown>)
            : {}

    const format =
        rawHiitData.format === 'circuit' || rawHiitData.format === 'interval'
            ? rawHiitData.format
            : 'interval'
    const rounds = toPositiveNumber(rawHiitData.rounds, 4)
    const workSec = toPositiveNumber(rawHiitData.workSec, 40)
    const restSec = toPositiveNumber(rawHiitData.restSec, 20)
    const restBetweenRoundsSec = toOptionalPositiveNumber(
        rawHiitData.restBetweenRoundsSec,
    )
    const exercises = Array.isArray(rawHiitData.exercises)
        ? rawHiitData.exercises
              .filter((exercise) => typeof exercise === 'string')
              .map((exercise) => exercise.trim())
              .filter(Boolean)
        : []
    const completedRounds =
        typeof rawHiitData.completedRounds === 'number' &&
        Number.isFinite(rawHiitData.completedRounds)
            ? Math.max(0, Math.min(rounds, rawHiitData.completedRounds))
            : 0
    const completedExerciseNames = Array.isArray(rawHiitData.completedExerciseNames)
        ? rawHiitData.completedExerciseNames
              .filter((item) => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
        : []

    return {
        format,
        rounds,
        workSec,
        restSec,
        ...(restBetweenRoundsSec ? { restBetweenRoundsSec } : {}),
        exercises,
        completedRounds,
        completedExerciseNames,
        ...(typeof rawHiitData.notes === 'string'
            ? { notes: rawHiitData.notes }
            : {}),
    }
}

const normalizeRunningSessionData = (
    record: Record<string, unknown>,
): RunningSessionData => {
    const rawRunningData =
        record.runningData && typeof record.runningData === 'object'
            ? (record.runningData as Record<string, unknown>)
            : {}

    const runType = normalizeRunningTypeValue(rawRunningData.runType, 'Footing')

    const targetDistanceKm = toOptionalPositiveNumber(
        rawRunningData.targetDistanceKm,
    )
    const targetDurationMin = toOptionalPositiveNumber(
        rawRunningData.targetDurationMin,
    )
    const distanceKm = toOptionalPositiveNumber(rawRunningData.distanceKm)
    const durationSec = toOptionalPositiveNumber(rawRunningData.durationSec)
    const avgPaceSecPerKm = toOptionalPositiveNumber(
        rawRunningData.avgPaceSecPerKm,
    )
    const gpxData = normalizeRunningGpxData(rawRunningData.gpxData)

    return {
        runType,
        ...(targetDistanceKm ? { targetDistanceKm } : {}),
        ...(targetDurationMin ? { targetDurationMin } : {}),
        ...(distanceKm ? { distanceKm } : {}),
        ...(durationSec ? { durationSec } : {}),
        ...(avgPaceSecPerKm ? { avgPaceSecPerKm } : {}),
        ...(gpxData ? { gpxData } : {}),
        ...(typeof rawRunningData.notes === 'string'
            ? { notes: rawRunningData.notes }
            : {}),
    }
}

const normalizeBreathingSessionData = (
    record: Record<string, unknown>,
): BreathingSessionData => {
    const rawBreathingData =
        record.breathingData && typeof record.breathingData === 'object'
            ? (record.breathingData as Record<string, unknown>)
            : {}

    const inhaleSec = toPositiveNumber(rawBreathingData.inhaleSec, 5)
    const exhaleSec = toPositiveNumber(rawBreathingData.exhaleSec, 5)
    const durationSec = toPositiveNumber(rawBreathingData.durationSec, 300)
    const elapsedSec =
        typeof rawBreathingData.elapsedSec === 'number' &&
        Number.isFinite(rawBreathingData.elapsedSec)
            ? Math.max(0, Math.min(durationSec, Math.round(rawBreathingData.elapsedSec)))
            : 0
    const cycleSec = inhaleSec + exhaleSec
    const completedCycles =
        typeof rawBreathingData.completedCycles === 'number' &&
        Number.isFinite(rawBreathingData.completedCycles)
            ? Math.max(0, Math.round(rawBreathingData.completedCycles))
            : cycleSec > 0
              ? Math.floor(elapsedSec / cycleSec)
              : 0

    return {
        inhaleSec,
        exhaleSec,
        durationSec,
        elapsedSec,
        completedCycles,
        ...(typeof rawBreathingData.notes === 'string'
            ? { notes: rawBreathingData.notes }
            : {}),
    }
}

const sessionFromSnapshot = (
    snapshot: QueryDocumentSnapshot<WorkoutSessionDocument>,
): WorkoutSession => {
    const data = snapshot.data()
    const record = data as unknown as Record<string, unknown>
    const sessionType = normalizeSessionType(record.sessionType, 'strength')
    const strengthData = normalizeStrengthSessionData(record)
    const hiitData = normalizeHiitSessionData(record)
    const runningData = normalizeRunningSessionData(record)
    const breathingData = normalizeBreathingSessionData(record)

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
                  sessionType: normalizeSessionType(
                      (data.sourceTemplate as Record<string, unknown>).sessionType,
                      sessionType,
                  ),
              }
            : data.templateId && data.templateName
              ? {
                    id: data.templateId,
                    name: data.templateName,
                    version: WORKOUT_TEMPLATE_SCHEMA_VERSION,
                    sessionType,
                }
              : null

    return {
        id: snapshot.id,
        sessionType,
        status: data.status,
        startedAt: data.startedAt ?? null,
        endedAt: data.endedAt ?? data.completedAt ?? null,
        completedAt: data.completedAt ?? null,
        plannedExercises: strengthData.plannedExercises,
        performedExercises: strengthData.performedExercises,
        performedExerciseIds: strengthData.performedExerciseIds,
        strengthData,
        hiitData,
        runningData,
        breathingData,
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
    const strengthExercises =
        template.strengthConfig?.exercises || template.exercises || []

    return strengthExercises.map((exercise, index) => {
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

    if (
        template.sessionType === 'strength' &&
        !(template.strengthConfig?.exercises || template.exercises || []).length
    ) {
        throw new Error('Ce template ne contient aucun exercice.')
    }

    return template
}

export const listWorkoutTemplates = async (
    uid: string,
): Promise<WorkoutTemplate[]> => {
    const templatesRef = fitnessCollections.workoutTemplates<WorkoutTemplateDocument>(uid)
    const snapshot = await getDocs(templatesRef)

    return sortByMostRecent(snapshot.docs.map(templateFromSnapshot)).filter(
        (template) => !template.isArchived,
    )
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
        sessionType: normalized.sessionType,
        description: normalized.description || '',
        isArchived: Boolean(normalized.isArchived),
        tags: normalized.tags,
        exercises: normalized.strengthConfig?.exercises || normalized.exercises,
        strengthConfig: normalized.strengthConfig || {
            exercises: normalized.exercises,
        },
        hiitConfig: normalized.hiitConfig || null,
        runningConfig: normalized.runningConfig || null,
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
        sessionType: normalized.sessionType,
        description: normalized.description || '',
        isArchived: Boolean(normalized.isArchived),
        tags: normalized.tags,
        exercises: normalized.strengthConfig?.exercises || normalized.exercises,
        strengthConfig: normalized.strengthConfig || {
            exercises: normalized.exercises,
        },
        hiitConfig: normalized.hiitConfig || null,
        runningConfig: normalized.runningConfig || null,
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
        sessionType: source.sessionType,
        description: source.description || '',
        isArchived: false,
        tags: source.tags || [],
        exercises: (source.strengthConfig?.exercises || source.exercises || []).map((exercise) => ({
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
        strengthConfig: {
            exercises: (source.strengthConfig?.exercises || source.exercises || []).map(
                (exercise) => ({
                    exerciseSource: normalizeExerciseSource(
                        exercise.exerciseSource,
                        'user',
                    ),
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
                }),
            ),
        },
        hiitConfig: source.hiitConfig || null,
        runningConfig: source.runningConfig || null,
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
    let snapshot
    try {
        snapshot = await getDocsFromServer(inProgressQuery)
    } catch {
        // Fallback when network/server read is temporarily unavailable.
        snapshot = await getDocs(inProgressQuery)
    }

    if (!snapshot.docs.length) {
        return null
    }

    const sessions = snapshot.docs
        .map(sessionFromSnapshot)
        .filter((session) => session.status === 'in_progress')
    if (!sessions.length) {
        return null
    }

    const sortedSessions = sortSessionsByDateDesc(
        sessions.filter((session) => session.sessionType !== 'breathing'),
    )

    return sortedSessions[0] || null
}

export const getInProgressBreathingSession = async (
    uid: string,
): Promise<WorkoutSession | null> => {
    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)
    const inProgressQuery = query(sessionsRef, where('status', '==', 'in_progress'))
    let snapshot
    try {
        snapshot = await getDocsFromServer(inProgressQuery)
    } catch {
        snapshot = await getDocs(inProgressQuery)
    }

    if (!snapshot.docs.length) {
        return null
    }

    const breathingSessions = snapshot.docs
        .map(sessionFromSnapshot)
        .filter(
            (session) =>
                session.status === 'in_progress' && session.sessionType === 'breathing',
        )

    if (!breathingSessions.length) {
        return null
    }

    const sortedSessions = sortSessionsByDateDesc(breathingSessions)

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
    const plannedExercises =
        template.sessionType === 'strength'
            ? convertTemplateToPlannedExercises(template)
            : []

    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)
    const hiitConfig = template.hiitConfig || {
        format: 'interval' as const,
        rounds: 4,
        workSec: 40,
        restSec: 20,
        exercises: [],
    }
    const runningConfig = template.runningConfig || {
        runType: 'Footing',
    }

    const sessionDocRef = await addDoc(sessionsRef, {
        sessionType: template.sessionType || 'strength',
        status: 'in_progress',
        startedAt: serverTimestamp(),
        endedAt: null,
        completedAt: null,
        plannedExercises,
        performedExercises: {},
        performedExerciseIds: [],
        strengthData: {
            plannedExercises,
            performedExercises: {},
            performedExerciseIds: [],
        },
        hiitData: {
            format: hiitConfig.format,
            rounds: hiitConfig.rounds,
            workSec: hiitConfig.workSec,
            restSec: hiitConfig.restSec,
            ...(hiitConfig.restBetweenRoundsSec
                ? { restBetweenRoundsSec: hiitConfig.restBetweenRoundsSec }
                : {}),
            exercises: hiitConfig.exercises || [],
            completedRounds: 0,
            completedExerciseNames: [],
        },
        runningData: {
            runType: runningConfig.runType,
            ...(runningConfig.targetDistanceKm
                ? { targetDistanceKm: runningConfig.targetDistanceKm }
                : {}),
            ...(runningConfig.targetDurationMin
                ? { targetDurationMin: runningConfig.targetDurationMin }
                : {}),
        },
        sourceTemplate: {
            id: template.id,
            name: template.name,
            version: template.schemaVersion ?? WORKOUT_TEMPLATE_SCHEMA_VERSION,
            sessionType: template.sessionType,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: WORKOUT_SESSION_SCHEMA_VERSION,
        templateId: template.id,
        templateName: template.name,
    })

    return getWorkoutSessionById(uid, sessionDocRef.id)
}

export const startBreathingSession = async (
    uid: string,
    input?: CreateBreathingSessionInput,
): Promise<WorkoutSession> => {
    const existingBreathingSession = await getInProgressBreathingSession(uid)

    if (existingBreathingSession) {
        return existingBreathingSession
    }

    const inhaleSec = toPositiveNumber(input?.inhaleSec, 5)
    const exhaleSec = toPositiveNumber(input?.exhaleSec, 5)
    const durationSec = toPositiveNumber(input?.durationSec, 300)

    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)
    const sessionDocRef = await addDoc(sessionsRef, {
        sessionType: 'breathing',
        status: 'in_progress',
        startedAt: serverTimestamp(),
        endedAt: null,
        completedAt: null,
        plannedExercises: [],
        performedExercises: {},
        performedExerciseIds: [],
        strengthData: {
            plannedExercises: [],
            performedExercises: {},
            performedExerciseIds: [],
        },
        breathingData: {
            inhaleSec,
            exhaleSec,
            durationSec,
            elapsedSec: 0,
            completedCycles: 0,
        },
        sourceTemplate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: WORKOUT_SESSION_SCHEMA_VERSION,
    })

    return getWorkoutSessionById(uid, sessionDocRef.id)
}

const buildPlannedExerciseForSessionInsert = (
    input: {
        exerciseSource: ExerciseSource
        exerciseId: string | null
        exerciseSnapshot: ExerciseSnapshot
    },
    orderIndex: number,
): PlannedWorkoutExercise => {
    const name = normalizeString(input.exerciseSnapshot.name)

    if (!name) {
        throw new Error('Nom d’exercice invalide.')
    }

    const muscleGroup = normalizeString(input.exerciseSnapshot.muscleGroup)
    const equipment = normalizeString(input.exerciseSnapshot.equipment)
    const exerciseSource = normalizeExerciseSource(input.exerciseSource, 'user')
    const exerciseId = input.exerciseId || null
    const plannedExerciseId = `planned_${orderIndex + 1}_${sanitizeKey(exerciseId || name)}_${Date.now()}`
    const isNoSetsExercise = isCardioNoSetsExercise({
        name,
        muscleGroup,
        equipment,
    })

    return {
        plannedExerciseId,
        exerciseSource,
        exerciseId,
        exerciseSnapshot: {
            name,
            muscleGroup,
            equipment,
        },
        name,
        muscleGroup,
        equipment,
        orderIndex,
        plannedSets: isNoSetsExercise ? [] : [{ setNumber: 1 }],
    }
}

export const addExerciseToWorkoutSession = async (
    uid: string,
    sessionId: string,
    input: {
        exerciseSource: ExerciseSource
        exerciseId: string | null
        exerciseSnapshot: ExerciseSnapshot
    },
): Promise<PlannedWorkoutExercise> => {
    const currentSession = await getWorkoutSessionById(uid, sessionId)

    if (currentSession.status !== 'in_progress') {
        throw new Error('Seules les séances en cours peuvent être modifiées.')
    }
    if (currentSession.sessionType !== 'strength') {
        throw new Error('Ajout manuel d’exercice disponible uniquement pour les séances force.')
    }

    const orderIndex = currentSession.plannedExercises.length
    const plannedExercise = buildPlannedExerciseForSessionInsert(input, orderIndex)
    const sessionRef = doc(
        fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid),
        sessionId,
    )

    await updateDoc(sessionRef, {
        plannedExercises: [...currentSession.plannedExercises, plannedExercise],
        'strengthData.plannedExercises': [
            ...currentSession.plannedExercises,
            plannedExercise,
        ],
        updatedAt: serverTimestamp(),
    })

    return plannedExercise
}

export const updatePerformedExercise = async (
    uid: string,
    sessionId: string,
    input: SavePerformedExerciseInput,
): Promise<void> => {
    const currentSession = await getWorkoutSessionById(uid, sessionId)

    if (currentSession.sessionType !== 'strength') {
        throw new Error('Le mode sets/reps est réservé aux séances force.')
    }

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
        [`strengthData.performedExercises.${input.plannedExerciseId}`]: nextPerformed,
        performedExerciseIds: arrayUnion(...trackedIds),
        'strengthData.performedExerciseIds': arrayUnion(...trackedIds),
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
        if (currentSession.sessionType !== 'strength') {
            throw new Error('Le mode sets/reps est réservé aux séances force.')
        }
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

export const updateHiitSessionData = async (
    uid: string,
    sessionId: string,
    input: UpdateHiitSessionInput,
): Promise<void> => {
    const currentSession = await getWorkoutSessionById(uid, sessionId)

    if (currentSession.sessionType !== 'hiit') {
        throw new Error('Cette séance n’est pas de type HIIT.')
    }

    const sessionRef = doc(
        fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid),
        sessionId,
    )
    const nextHiit = {
        ...currentSession.hiitData,
        ...(typeof input.completedRounds === 'number'
            ? { completedRounds: Math.max(0, input.completedRounds) }
            : {}),
        ...(Array.isArray(input.completedExerciseNames)
            ? {
                  completedExerciseNames: input.completedExerciseNames
                      .map((name) => name.trim())
                      .filter(Boolean),
              }
            : {}),
        ...(typeof input.notes === 'string' ? { notes: input.notes } : {}),
    }

    await updateDoc(sessionRef, {
        hiitData: nextHiit,
        updatedAt: serverTimestamp(),
    })
}

export const updateRunningSessionData = async (
    uid: string,
    sessionId: string,
    input: UpdateRunningSessionInput,
): Promise<void> => {
    const currentSession = await getWorkoutSessionById(uid, sessionId)

    if (currentSession.sessionType !== 'running') {
        throw new Error('Cette séance n’est pas de type running.')
    }

    const sessionRef = doc(
        fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid),
        sessionId,
    )

    const normalizedGpxData =
        Object.prototype.hasOwnProperty.call(input, 'gpxData') &&
        input.gpxData !== null
            ? normalizeRunningGpxData(input.gpxData)
            : undefined

    const nextRunning = {
        ...currentSession.runningData,
        ...(typeof input.distanceKm === 'number' && Number.isFinite(input.distanceKm)
            ? { distanceKm: Math.max(0, input.distanceKm) }
            : {}),
        ...(typeof input.durationSec === 'number' && Number.isFinite(input.durationSec)
            ? { durationSec: Math.max(0, input.durationSec) }
            : {}),
        ...(typeof input.avgPaceSecPerKm === 'number' &&
        Number.isFinite(input.avgPaceSecPerKm)
            ? { avgPaceSecPerKm: Math.max(0, input.avgPaceSecPerKm) }
            : {}),
        ...(Object.prototype.hasOwnProperty.call(input, 'gpxData')
            ? { gpxData: normalizedGpxData || null }
            : {}),
        ...(typeof input.notes === 'string' ? { notes: input.notes } : {}),
    }

    await updateDoc(sessionRef, {
        runningData: nextRunning,
        updatedAt: serverTimestamp(),
    })
}

export const updateBreathingSessionData = async (
    uid: string,
    sessionId: string,
    input: UpdateBreathingSessionInput,
): Promise<void> => {
    const currentSession = await getWorkoutSessionById(uid, sessionId)

    if (currentSession.sessionType !== 'breathing') {
        throw new Error('Cette séance n’est pas de type respiration.')
    }

    const sessionRef = doc(
        fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid),
        sessionId,
    )

    const durationSec = toPositiveNumber(
        currentSession.breathingData?.durationSec,
        300,
    )
    const inhaleSec = toPositiveNumber(currentSession.breathingData?.inhaleSec, 5)
    const exhaleSec = toPositiveNumber(currentSession.breathingData?.exhaleSec, 5)
    const cycleSec = inhaleSec + exhaleSec

    const nextElapsedSec =
        typeof input.elapsedSec === 'number' && Number.isFinite(input.elapsedSec)
            ? Math.max(0, Math.min(durationSec, Math.round(input.elapsedSec)))
            : currentSession.breathingData?.elapsedSec || 0
    const nextCompletedCycles =
        typeof input.completedCycles === 'number' &&
        Number.isFinite(input.completedCycles)
            ? Math.max(0, Math.round(input.completedCycles))
            : cycleSec > 0
              ? Math.floor(nextElapsedSec / cycleSec)
              : 0

    await updateDoc(sessionRef, {
        breathingData: {
            ...(currentSession.breathingData || {
                inhaleSec,
                exhaleSec,
                durationSec,
                elapsedSec: 0,
                completedCycles: 0,
            }),
            elapsedSec: nextElapsedSec,
            completedCycles: nextCompletedCycles,
            ...(typeof input.notes === 'string' ? { notes: input.notes } : {}),
        },
        updatedAt: serverTimestamp(),
    })
}

const clampCount = (value: unknown, fallback: number, min = 1, max = 99) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback
    }

    return Math.min(max, Math.max(min, Math.round(value)))
}

const buildManualStrengthSnapshot = (
    exerciseCount: number,
): StrengthSessionData => {
    const plannedExercises: PlannedWorkoutExercise[] = Array.from(
        { length: exerciseCount },
        (_, index) => {
            const name = `Exercice ${index + 1}`
            const plannedExerciseId = `planned_manual_${index + 1}_${sanitizeKey(name)}_${Date.now()}`

            return {
                plannedExerciseId,
                exerciseSource: 'user',
                exerciseId: null,
                exerciseSnapshot: {
                    name,
                    muscleGroup: '',
                    equipment: '',
                },
                name,
                muscleGroup: '',
                equipment: '',
                orderIndex: index,
                plannedSets: [{ setNumber: 1 }],
            }
        },
    )

    const performedExercises = plannedExercises.reduce<
        Record<string, PerformedWorkoutExercise>
    >((accumulator, plannedExercise) => {
        accumulator[plannedExercise.plannedExerciseId] = {
            plannedExerciseId: plannedExercise.plannedExerciseId,
            exerciseSource: plannedExercise.exerciseSource,
            exerciseId: plannedExercise.exerciseId,
            exerciseSnapshot: plannedExercise.exerciseSnapshot,
            name: plannedExercise.name,
            status: 'completed',
            sets: [],
            notes: '',
        }
        return accumulator
    }, {})

    const performedExerciseIds = plannedExercises.map(
        (plannedExercise) => plannedExercise.plannedExerciseId,
    )

    return {
        plannedExercises,
        performedExercises,
        performedExerciseIds,
    }
}

export const createPastWorkoutSession = async (
    uid: string,
    input: CreatePastWorkoutSessionInput,
): Promise<WorkoutSession> => {
    const sessionType = normalizeSessionType(input.sessionType, 'strength')
    const startedAtDate =
        input.startedAt instanceof Date ? input.startedAt : new Date(input.startedAt)

    if (Number.isNaN(startedAtDate.getTime())) {
        throw new Error('Date de séance invalide.')
    }

    const durationMin = clampCount(input.durationMin, 45, 1, 24 * 60)
    const durationSec = durationMin * 60
    const endedAtDate = new Date(startedAtDate.getTime() + durationSec * 1000)

    if (startedAtDate.getTime() > Date.now()) {
        throw new Error('La date doit être dans le passé.')
    }

    const sourceName = normalizeString(input.sourceName) || 'Saisie manuelle'
    const notes = normalizeString(input.notes)
    const startedAt = Timestamp.fromDate(startedAtDate)
    const endedAt = Timestamp.fromDate(endedAtDate)

    const strengthData =
        sessionType === 'strength'
            ? buildManualStrengthSnapshot(
                  clampCount(input.strengthExerciseCount, 4, 1, 50),
              )
            : {
                  plannedExercises: [],
                  performedExercises: {},
                  performedExerciseIds: [],
              }

    const hiitRounds = clampCount(input.hiitRounds, 4, 1, 30)
    const hiitExerciseCount = clampCount(input.hiitExerciseCount, 4, 1, 30)
    const hiitExercises = Array.from(
        { length: hiitExerciseCount },
        (_, index) => `Exercice HIIT ${index + 1}`,
    )

    const runningDistanceKm =
        typeof input.distanceKm === 'number' && Number.isFinite(input.distanceKm)
            ? Math.max(0, Number(input.distanceKm))
            : undefined
    const runningPaceSecPerKm =
        runningDistanceKm && runningDistanceKm > 0
            ? roundNumber(durationSec / runningDistanceKm, 1)
            : undefined

    const breathingCompletedCycles = clampCount(
        input.breathingCompletedCycles,
        Math.max(1, Math.floor(durationSec / 10)),
        1,
        999,
    )

    const sessionsRef = fitnessCollections.workoutSessions<WorkoutSessionDocument>(uid)
    const sessionDocRef = await addDoc(sessionsRef, {
        sessionType,
        status: 'completed',
        startedAt,
        endedAt,
        completedAt: endedAt,
        plannedExercises: strengthData.plannedExercises,
        performedExercises: strengthData.performedExercises,
        performedExerciseIds: strengthData.performedExerciseIds,
        strengthData,
        ...(sessionType === 'hiit'
            ? {
                  hiitData: {
                      format: 'interval' as const,
                      rounds: hiitRounds,
                      workSec: 40,
                      restSec: 20,
                      exercises: hiitExercises,
                      completedRounds: hiitRounds,
                      completedExerciseNames: hiitExercises,
                      ...(notes ? { notes } : {}),
                  },
              }
            : {}),
        ...(sessionType === 'running'
            ? {
                  runningData: {
                      runType: normalizeRunningTypeValue(input.runningType, 'Footing'),
                      ...(typeof runningDistanceKm === 'number'
                          ? { distanceKm: roundNumber(runningDistanceKm, 2) }
                          : {}),
                      durationSec,
                      ...(typeof runningPaceSecPerKm === 'number'
                          ? { avgPaceSecPerKm: runningPaceSecPerKm }
                          : {}),
                      ...(notes ? { notes } : {}),
                  },
              }
            : {}),
        ...(sessionType === 'breathing'
            ? {
                  breathingData: {
                      inhaleSec: 5,
                      exhaleSec: 5,
                      durationSec,
                      elapsedSec: durationSec,
                      completedCycles: breathingCompletedCycles,
                      ...(notes ? { notes } : {}),
                  },
              }
            : {}),
        sourceTemplate: {
            id: 'manual_entry',
            name: sourceName,
            version: WORKOUT_TEMPLATE_SCHEMA_VERSION,
            sessionType,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: WORKOUT_SESSION_SCHEMA_VERSION,
        templateId: 'manual_entry',
        templateName: sourceName,
    })

    return getWorkoutSessionById(uid, sessionDocRef.id)
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
export const getCurrentBreathingSession = getInProgressBreathingSession
export const finishWorkoutSession = completeWorkoutSession
