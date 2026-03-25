import type { Product } from '@/@types/product'
import type { ReviewDraft } from '@/@types/review'
import {
    generateNameWithFormat,
    pickReviewText,
    generateBatchId,
    type NameFormat,
    type ReviewLocale,
} from '@/utils/reviewGenerator'

export type Freshness = 'ok' | 'stale' | 'very_stale' | 'none'
export type BatchPreset = 'auto' | 'light' | 'normal' | 'boost'
export type ReviewGenOptions = {
    nameFormat?: NameFormat
    locale?: ReviewLocale
}

const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

export const getFreshness = (newestDate?: string, reviewCount?: number): Freshness => {
    if (!newestDate || !reviewCount) return 'none'
    const newest = new Date(newestDate)
    if (Number.isNaN(newest.getTime())) return 'none'
    const diffDays = Math.floor((Date.now() - newest.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays > 180) return 'very_stale'
    if (diffDays > 90) return 'stale'
    return 'ok'
}

export const recommendedCount = (freshness: Freshness): [number, number] => {
    if (freshness === 'ok') return [0, 0]
    if (freshness === 'stale') return [1, 1]
    if (freshness === 'very_stale') return [2, 4]
    return [2, 4]
}

export const presetCount = (preset: BatchPreset): [number, number] => {
    switch (preset) {
        case 'light':
            return [1, 1]
        case 'normal':
            return [2, 3]
        case 'boost':
            return [4, 6]
        default:
            return [0, 0]
    }
}

const randomDateBetweenDays = (minDays: number, maxDays: number) => {
    const start = daysAgo(maxDays).getTime()
    const end = daysAgo(minDays).getTime()
    const rand = start + Math.random() * (end - start)
    const date = new Date(rand)
    date.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0)
    return date.toISOString()
}

export const generateDatesForCount = (count: number): string[] => {
    if (count <= 0) return []
    if (count === 1) {
        return [randomDateBetweenDays(0, 14)]
    }
    if (count === 2) {
        return shuffle([
            randomDateBetweenDays(0, 7),
            randomDateBetweenDays(14, 45),
        ])
    }
    if (count === 3) {
        return shuffle([
            randomDateBetweenDays(0, 7),
            randomDateBetweenDays(14, 45),
            randomDateBetweenDays(60, 120),
        ])
    }
    const maxAgeDays = count > 5 ? 180 : 120
    const dates: string[] = [randomDateBetweenDays(0, 7)]
    while (dates.length < count) {
        dates.push(randomDateBetweenDays(14, maxAgeDays))
    }
    return shuffle(dates)
}

export const generateRatingsForCount = (count: number): (3 | 4 | 5)[] => {
    if (count <= 0) return []
    const max3 = Math.min(1, Math.floor(count * 0.05))
    const count3 = max3 > 0 && Math.random() < 0.25 ? 1 : 0

    const min5 = Math.ceil(count * 0.75)
    const max5 = Math.floor(count * 0.85)
    const remaining = count - count3

    let count5 = randInt(min5, Math.max(min5, max5))
    if (count5 > remaining) count5 = remaining
    if (count5 < 0) count5 = 0

    let count4 = remaining - count5
    const min4 = Math.ceil(count * 0.15)
    if (count4 < min4) {
        const need = Math.min(min4 - count4, count5 - min5)
        if (need > 0) {
            count4 += need
            count5 -= need
        }
    }

    const ratings = [
        ...Array(count5).fill(5),
        ...Array(count4).fill(4),
        ...Array(count3).fill(3),
    ] as (3 | 4 | 5)[]

    return shuffle(ratings)
}

export const generateReviewsForProduct = (
    product: Product,
    count: number,
    options: ReviewGenOptions = {}
): ReviewDraft[] => {
    if (count <= 0) return []
    const usedNames = new Set<string>()
    const usedTexts = new Set<string>()
    const dates = generateDatesForCount(count)
    const ratings = generateRatingsForCount(count)

    const reviews: ReviewDraft[] = []
    for (let i = 0; i < count; i++) {
        let tries = 0
        let name = ''
        let nameFormat: ReviewDraft['nameFormat'] = 'first_last_initial'
        let locale: ReviewDraft['locale'] = 'en_US'
        while (tries < 10) {
            const generated = generateNameWithFormat(options.nameFormat, options.locale)
            name = generated.name
            nameFormat = generated.format
            locale = generated.locale
            if (!usedNames.has(name)) break
            tries++
        }
        usedNames.add(name)

        const text = pickReviewText(product, usedTexts)
        reviews.push({
            id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
            authorName: name,
            nameFormat,
            locale,
            rating: ratings[i],
            date: dates[i],
            text,
            source: 'generated',
            promptLanguage: 'en',
            promptLength: 'medium',
        })
    }

    return reviews
}

export const generateSingleReviewForProduct = (
    product: Product,
    options: ReviewGenOptions = {}
): ReviewDraft => {
    return generateReviewsForProduct(product, 1, options)[0]
}

export const buildBatchPlan = (
    products: Product[],
    stats: Record<string, { newestReviewDate?: string; reviewCount: number }>,
    preset: BatchPreset
) => {
    const batchId = generateBatchId()
    const perProduct: Record<string, ReviewDraft[]> = {}

    products.forEach((product) => {
        const stat = stats[product.sku]
        const freshness = getFreshness(stat?.newestReviewDate, stat?.reviewCount)
        const [autoMin, autoMax] = recommendedCount(freshness)
        const [presetMin, presetMax] = preset === 'auto' ? [autoMin, autoMax] : presetCount(preset)
        const min = preset === 'auto' ? autoMin : presetMin
        const max = preset === 'auto' ? autoMax : presetMax
        const count = min === max ? min : randInt(min, max)
        if (count <= 0) return
        perProduct[product.sku] = generateReviewsForProduct(product, count)
    })

    return { batchId, perProduct }
}
