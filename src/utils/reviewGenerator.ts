import type { ReviewDraft } from '@/@types/review'
import type { Product } from '@/@types/product'
import { reviewLibrary } from '@/data/reviewLibrary'
import { fakerEN_US, fakerEN_GB, fakerES, fakerFR, fakerDE } from '@faker-js/faker'

export type NameFormat = 'first_last_initial' | 'first' | 'first_last'
export type ReviewLocale = 'en_US' | 'en_GB' | 'fr_FR' | 'es_ES' | 'de_DE'

const LOCALE_MAP: Record<ReviewLocale, typeof fakerEN_US> = {
    en_US: fakerEN_US,
    en_GB: fakerEN_GB,
    es_ES: fakerES,
    fr_FR: fakerFR,
    de_DE: fakerDE,
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

const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const generateBatchId = () =>
    `fmz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const getProductContext = (product: Product) => {
    const productName =
        typeof (product as any).getNameWithCategory === 'function'
            ? (product as any).getNameWithCategory()
            : product.name
    return {
        product: productName ? `${productName}` : 'this font',
        keyword: product.mainKeyword || product.name || 'this font',
        second: product.secondKeyword || 'custom',
    }
}

const applyTemplate = (template: string, ctx: ReturnType<typeof getProductContext>) =>
    template
        .replace(/{{product}}/g, ctx.product)
        .replace(/{{keyword}}/g, ctx.keyword)
        .replace(/{{second}}/g, ctx.second)

export const pickReviewText = (
    product: Product,
    used: Set<string>
): string => {
    const ctx = getProductContext(product)
    const candidates = shuffle(reviewLibrary)
    for (const t of candidates) {
        const text = applyTemplate(t, ctx)
        if (!used.has(text)) {
            used.add(text)
            return text
        }
    }
    const fallback = applyTemplate(randomItem(reviewLibrary), ctx)
    used.add(fallback)
    return fallback
}

const pickNameFormat = (): NameFormat => {
    const r = Math.random()
    if (r < 0.7) return 'first_last_initial'
    if (r < 0.9) return 'first'
    return 'first_last'
}

const pickLocale = (): ReviewLocale => {
    const roll = Math.random()
    if (roll < 0.40) return 'en_US'
    if (roll < 0.64) return 'en_GB'
    if (roll < 0.74) return 'es_ES'
    if (roll < 0.81) return 'fr_FR'
    return 'de_DE'
}

export const generateNameWithFormat = (
    format?: NameFormat,
    locale?: ReviewLocale
): { name: string; format: NameFormat; locale: ReviewLocale } => {
    const chosenLocale = locale || pickLocale()
    const faker = LOCALE_MAP[chosenLocale]
    const first = faker.person.firstName()
    const last = faker.person.lastName()
    const chosen = format || pickNameFormat()
    if (chosen === 'first') return { name: `${first}`, format: chosen, locale: chosenLocale }
    if (chosen === 'first_last') return { name: `${first} ${last}`, format: chosen, locale: chosenLocale }
    return { name: `${first} ${last[0]}.`, format: 'first_last_initial', locale: chosenLocale }
}

const generateRatings = (count: number): (3 | 4 | 5)[] => {
    const max3 = Math.floor(count * 0.05)
    const min5 = Math.ceil(count * 0.75)
    const max5 = Math.floor(count * 0.85)
    const min4 = Math.ceil(count * 0.10)
    const max4 = Math.floor(count * 0.20)

    for (let i = 0; i < 200; i++) {
        const count3 = randInt(0, max3)
        const count4 = randInt(min4, Math.min(max4, count - count3))
        const count5 = count - count3 - count4
        if (count5 >= min5 && count5 <= max5) {
            return shuffle([
                ...Array(count5).fill(5),
                ...Array(count4).fill(4),
                ...Array(count3).fill(3),
            ]) as (3 | 4 | 5)[]
        }
    }

    const count4 = Math.min(max4, Math.max(min4, Math.round(count * 0.15)))
    const count3 = Math.min(max3, Math.max(0, count - count4 - min5))
    const count5 = Math.max(0, count - count4 - count3)
    return shuffle([
        ...Array(count5).fill(5),
        ...Array(count4).fill(4),
        ...Array(count3).fill(3),
    ]) as (3 | 4 | 5)[]
}

const randomDateBetween = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime()
    const rand = start.getTime() + Math.random() * diff
    const date = new Date(rand)
    date.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0)
    return date
}

const generateDates = (count: number): string[] => {
    const now = new Date()
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
    const maxAgeDays = count > 5 ? 180 : 120
    const burstCount = Math.min(count, randInt(1, 2))
    const dates: Date[] = []

    for (let i = 0; i < burstCount; i++) {
        dates.push(randomDateBetween(daysAgo(7), now))
    }
    for (let i = burstCount; i < count; i++) {
        dates.push(randomDateBetween(daysAgo(maxAgeDays), daysAgo(8)))
    }

    return shuffle(dates).map((d) => d.toISOString())
}

export const generateReviews = (
    product: Product,
    count: number
): { reviews: ReviewDraft[]; batchId: string } => {
    const usedTexts = new Set<string>()
    const ratings = generateRatings(count)
    const dates = generateDates(count)
    const batchId = generateBatchId()
    const reviews: ReviewDraft[] = Array.from({ length: count }).map((_, i) => ({
        ...(() => {
            const { name, format, locale } = generateNameWithFormat()
            return {
                authorName: name,
                nameFormat: format,
                locale,
                promptLanguage: 'en',
                promptLength: 'medium',
            }
        })(),
        id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        rating: ratings[i],
        date: dates[i],
        text: Math.random() < 0.4 ? pickReviewText(product, usedTexts) : '',
        source: 'generated',
    }))

    return { reviews, batchId }
}

export const generateSingleReview = (
    product: Product,
    usedTexts: Set<string>
): ReviewDraft => ({
    ...(() => {
        const { name, format, locale } = generateNameWithFormat()
        return {
            authorName: name,
            nameFormat: format,
            locale,
            promptLanguage: 'en',
            promptLength: 'medium',
        }
    })(),
    id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    rating: 5,
    date: new Date().toISOString(),
    text: Math.random() < 0.4 ? pickReviewText(product, usedTexts) : '',
    source: 'generated',
})

export const shuffleReviews = (reviews: ReviewDraft[]): ReviewDraft[] => shuffle(reviews)
