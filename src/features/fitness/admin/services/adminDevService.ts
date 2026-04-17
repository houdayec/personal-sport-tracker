import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'
import globalExercisesCatalog from '@/features/fitness/admin/data/globalExercises.catalog.json'
import hiitGlobalExercisesCatalog from '@/features/fitness/admin/data/hiitGlobalExercises.catalog.json'
import { fitnessCollections } from '@/features/fitness/common/services'
import { EXERCISE_SCHEMA_VERSION } from '@/features/fitness/training/types/exercise'
import runningTypesCatalog from '@/features/fitness/training/data/globalRunningTypes.catalog.json'
import { RUNNING_TYPE_SCHEMA_VERSION } from '@/features/fitness/training/types/runningType'

type GlobalExerciseSeedItem = {
    name: string
    name_en: string
    muscleGroup: string
    equipment: string
}

type GlobalExerciseSeedCategory = {
    category: string
    exercises: GlobalExerciseSeedItem[]
}

type SeedGlobalExercisesRequest = {
    seedData: GlobalExerciseSeedCategory[]
}

type SeedGlobalExercisesResponse = {
    upserted: number
}

type GlobalExerciseSeedDocument = {
    name: string
    nameEn: string
    muscleGroup: string
    equipment: string
    category: string
    isArchived: boolean
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
    schemaVersion: number
}

type GlobalRunningTypeSeedItem = {
    name: string
    name_en: string
    description: string
    defaultGoal: string
    muscleGroup: string
}

type GlobalRunningTypeSeedCategory = {
    category: string
    types: GlobalRunningTypeSeedItem[]
}

type SeedGlobalRunningTypesRequest = {
    seedData: GlobalRunningTypeSeedCategory[]
}

type GlobalRunningTypeSeedDocument = {
    name: string
    nameEn: string
    description: string
    defaultGoal: string
    muscleGroup: string
    category: string
    isArchived: boolean
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
    schemaVersion: number
}

const MAX_BATCH_OPERATIONS = 450

const toSlug = (value: string): string => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

const buildGlobalExerciseId = (
    category: GlobalExerciseSeedCategory,
    exercise: GlobalExerciseSeedItem,
): string => {
    const categorySlug = toSlug(category.category)
    const nameSlug = toSlug(exercise.name_en || exercise.name)
    return `${categorySlug}__${nameSlug}`
}

const buildGlobalRunningTypeId = (
    category: GlobalRunningTypeSeedCategory,
    runningType: GlobalRunningTypeSeedItem,
): string => {
    const categorySlug = toSlug(category.category)
    const nameSlug = toSlug(runningType.name_en || runningType.name)
    return `${categorySlug}__${nameSlug}`
}

const validateSeedPayload = (payload: SeedGlobalExercisesRequest): void => {
    if (!Array.isArray(payload.seedData) || payload.seedData.length === 0) {
        throw new Error('Le catalogue local de seed est vide.')
    }

    payload.seedData.forEach((category) => {
        if (!category.category?.trim()) {
            throw new Error('Chaque catégorie du seed doit avoir un nom.')
        }

        if (!Array.isArray(category.exercises) || category.exercises.length === 0) {
            throw new Error(`La catégorie "${category.category}" ne contient aucun exercice.`)
        }

        category.exercises.forEach((exercise) => {
            if (!exercise.name?.trim()) {
                throw new Error('Chaque exercice du seed doit avoir un nom.')
            }

            if (!exercise.name_en?.trim()) {
                throw new Error(`"${exercise.name}" doit avoir un champ name_en.`)
            }

            if (!exercise.muscleGroup?.trim() || !exercise.equipment?.trim()) {
                throw new Error(
                    `"${exercise.name}" doit avoir muscleGroup et equipment.`,
                )
            }
        })
    })
}

const validateRunningTypesSeedPayload = (
    payload: SeedGlobalRunningTypesRequest,
): void => {
    if (!Array.isArray(payload.seedData) || payload.seedData.length === 0) {
        throw new Error('Le catalogue local des types running est vide.')
    }

    payload.seedData.forEach((category) => {
        if (!category.category?.trim()) {
            throw new Error('Chaque catégorie running doit avoir un nom.')
        }

        if (!Array.isArray(category.types) || category.types.length === 0) {
            throw new Error(
                `La catégorie running "${category.category}" ne contient aucun type.`,
            )
        }

        category.types.forEach((runningType) => {
            if (!runningType.name?.trim()) {
                throw new Error('Chaque type running doit avoir un nom.')
            }

            if (!runningType.name_en?.trim()) {
                throw new Error(
                    `"${runningType.name}" doit avoir un champ name_en.`,
                )
            }

            if (!runningType.defaultGoal?.trim()) {
                throw new Error(
                    `"${runningType.name}" doit avoir defaultGoal.`,
                )
            }

            if (!runningType.muscleGroup?.trim()) {
                throw new Error(
                    `"${runningType.name}" doit avoir muscleGroup.`,
                )
            }
        })
    })
}

const seedGlobalExercisesCatalog = async (
    payload: SeedGlobalExercisesRequest,
): Promise<SeedGlobalExercisesResponse> => {
    validateSeedPayload(payload)

    const operations = payload.seedData.flatMap((category) => {
        return category.exercises.map((exercise) => {
            const exerciseId = buildGlobalExerciseId(category, exercise)
            const exerciseRef = doc(
                fitnessCollections.globalExercises<GlobalExerciseSeedDocument>(),
                exerciseId,
            )

            const data: GlobalExerciseSeedDocument = {
                name: exercise.name.trim(),
                nameEn: exercise.name_en.trim(),
                muscleGroup: exercise.muscleGroup.trim(),
                equipment: exercise.equipment.trim(),
                category: category.category.trim(),
                isArchived: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                schemaVersion: EXERCISE_SCHEMA_VERSION,
            }

            return { exerciseRef, data }
        })
    })

    let upserted = 0

    for (let index = 0; index < operations.length; index += MAX_BATCH_OPERATIONS) {
        const chunk = operations.slice(index, index + MAX_BATCH_OPERATIONS)
        const batch = writeBatch(db)

        chunk.forEach(({ exerciseRef, data }) => {
            batch.set(exerciseRef, data, { merge: true })
        })

        await batch.commit()
        upserted += chunk.length
    }

    return { upserted }
}

const seedGlobalRunningTypesCatalog = async (
    payload: SeedGlobalRunningTypesRequest,
): Promise<SeedGlobalExercisesResponse> => {
    validateRunningTypesSeedPayload(payload)

    const operations = payload.seedData.flatMap((category) => {
        return category.types.map((runningType) => {
            const runningTypeId = buildGlobalRunningTypeId(category, runningType)
            const runningTypeRef = doc(
                fitnessCollections.globalRunningTypes<GlobalRunningTypeSeedDocument>(),
                runningTypeId,
            )

            const data: GlobalRunningTypeSeedDocument = {
                name: runningType.name.trim(),
                nameEn: runningType.name_en.trim(),
                description: runningType.description?.trim() || '',
                defaultGoal: runningType.defaultGoal.trim(),
                muscleGroup: runningType.muscleGroup.trim(),
                category: category.category.trim(),
                isArchived: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                schemaVersion: RUNNING_TYPE_SCHEMA_VERSION,
            }

            return { runningTypeRef, data }
        })
    })

    let upserted = 0

    for (let index = 0; index < operations.length; index += MAX_BATCH_OPERATIONS) {
        const chunk = operations.slice(index, index + MAX_BATCH_OPERATIONS)
        const batch = writeBatch(db)

        chunk.forEach(({ runningTypeRef, data }) => {
            batch.set(runningTypeRef, data, { merge: true })
        })

        await batch.commit()
        upserted += chunk.length
    }

    return { upserted }
}

export const seedGlobalExercises = async (): Promise<SeedGlobalExercisesResponse> => {
    return seedGlobalExercisesCatalog({
        seedData: globalExercisesCatalog.global_exercises,
    })
}

export const seedGlobalHiitExercises = async (): Promise<SeedGlobalExercisesResponse> => {
    return seedGlobalExercisesCatalog({
        seedData: hiitGlobalExercisesCatalog.global_exercises,
    })
}

export const seedGlobalRunningTypes = async (): Promise<SeedGlobalExercisesResponse> => {
    return seedGlobalRunningTypesCatalog({
        seedData: runningTypesCatalog.global_running_types,
    })
}
