import runningTypesCatalog from '@/features/fitness/training/data/globalRunningTypes.catalog.json'

export interface RunningTypeOption {
    value: string
    label: string
    category: string
    description: string
    defaultGoal: string
    muscleGroup: string
}

const LEGACY_RUNNING_TYPE_LABELS: Record<string, string> = {
    easy: 'Footing',
    tempo: 'Tempo',
    interval: 'Intervalles',
    long_run: 'Sortie longue',
}

export const normalizeRunningTypeValue = (
    value: unknown,
    fallback = 'Footing',
): string => {
    if (typeof value !== 'string') {
        return fallback
    }

    const trimmed = value.trim()
    return trimmed || fallback
}

export const formatRunningTypeLabel = (value: unknown): string => {
    const runType = normalizeRunningTypeValue(value, 'Footing')
    const legacy = LEGACY_RUNNING_TYPE_LABELS[runType.toLowerCase()]

    return legacy || runType
}

export const getFallbackRunningTypeOptions = (): RunningTypeOption[] => {
    const unique = new Set<string>()

    return runningTypesCatalog.global_running_types
        .flatMap((category) =>
            category.types.map((type) => {
                const value = normalizeRunningTypeValue(type.name, '')

                if (!value) {
                    return null
                }

                const key = value.toLowerCase()
                if (unique.has(key)) {
                    return null
                }

                unique.add(key)

                return {
                    value,
                    label: value,
                    category: normalizeRunningTypeValue(category.category, 'running'),
                    description: normalizeRunningTypeValue(type.description, ''),
                    defaultGoal: normalizeRunningTypeValue(type.defaultGoal, 'time'),
                    muscleGroup: normalizeRunningTypeValue(type.muscleGroup, 'cardio'),
                }
            }),
        )
        .filter((option): option is RunningTypeOption => Boolean(option))
}

