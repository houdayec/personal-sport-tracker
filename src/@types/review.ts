export type ReviewDraft = {
    id: string
    authorName: string
    nameFormat?: 'first_last_initial' | 'first' | 'first_last'
    locale?: 'en_US' | 'en_GB' | 'fr_FR' | 'es_ES' | 'de_DE'
    promptLanguage?: 'en' | 'fr' | 'es' | 'de'
    promptLength?: 'short' | 'medium' | 'long'
    rating: 3 | 4 | 5
    date: string // ISO string
    text: string
    source: 'generated' | 'library' | 'manual'
}

export type ReviewSeed = {
    batchId: string
    createdReviewIds?: number[]
    createdAt?: number
}
