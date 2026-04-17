import { getDocs } from 'firebase/firestore'
import { fitnessCollections } from '@/features/fitness/common/services'
import type {
    GlobalRunningType,
    GlobalRunningTypeDocument,
} from '@/features/fitness/training/types/runningType'

const normalizeString = (value: unknown): string => {
    return typeof value === 'string' ? value.trim() : ''
}

const runningTypeFromRaw = (
    id: string,
    raw: Record<string, unknown>,
): GlobalRunningType => {
    return {
        id,
        name: normalizeString(raw.name),
        nameEn: normalizeString(raw.nameEn),
        description: normalizeString(raw.description),
        defaultGoal: normalizeString(raw.defaultGoal),
        muscleGroup: normalizeString(raw.muscleGroup),
        category: normalizeString(raw.category),
        isArchived: Boolean(raw.isArchived),
        createdAt: (raw.createdAt as GlobalRunningType['createdAt']) || null,
        updatedAt: (raw.updatedAt as GlobalRunningType['updatedAt']) || null,
        schemaVersion:
            typeof raw.schemaVersion === 'number' ? raw.schemaVersion : undefined,
    }
}

const sortRunningTypes = (items: GlobalRunningType[]): GlobalRunningType[] => {
    return items.sort((a, b) => {
        const categoryComparison = a.category.localeCompare(b.category, 'fr', {
            sensitivity: 'base',
        })

        if (categoryComparison !== 0) {
            return categoryComparison
        }

        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    })
}

export const listGlobalRunningTypes = async (): Promise<GlobalRunningType[]> => {
    const snapshot = await getDocs(
        fitnessCollections.globalRunningTypes<GlobalRunningTypeDocument>(),
    )

    const items = snapshot.docs
        .map((doc) => runningTypeFromRaw(doc.id, doc.data() as Record<string, unknown>))
        .filter((item) => !item.isArchived && item.name)

    return sortRunningTypes(items)
}

