interface ExerciseIdentityLike {
    name?: string
    muscleGroup?: string
    equipment?: string
}

const normalizeText = (value: string): string => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

const normalizeForTokenMatch = (value: string): string => {
    return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

const containsWordOrPhrase = (haystack: string, term: string): boolean => {
    if (!haystack || !term) {
        return false
    }

    const normalizedHaystack = ` ${normalizeForTokenMatch(haystack)} `
    const normalizedTerm = normalizeForTokenMatch(term)

    if (!normalizedTerm) {
        return false
    }

    return normalizedHaystack.includes(` ${normalizedTerm} `)
}

export const isCardioNoSetsExercise = (
    exercise: ExerciseIdentityLike | null | undefined,
): boolean => {
    if (!exercise) {
        return false
    }

    const haystack = `${exercise.name || ''} ${exercise.muscleGroup || ''} ${exercise.equipment || ''}`

    const noSetKeywords = [
        'cardio',
        'course',
        'running',
        'run',
        'jog',
        'tapis',
        'treadmill',
        'velo',
        'bike',
        'rameur',
        'rowing',
        'elliptique',
        'elliptical',
        'stairmaster',
        'stair climber',
    ]

    return noSetKeywords.some((keyword) =>
        containsWordOrPhrase(haystack, keyword),
    )
}
