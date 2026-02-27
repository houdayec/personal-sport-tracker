import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormikContext } from 'formik'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem } from '@/components/ui/Form'
import { Select, toast } from '@/components/ui'
import Notification from '@/components/ui/Notification'
import type { Product } from '@/@types/product'
import type { ReviewDraft } from '@/@types/review'
import { apiUpdateProductReviews, apiUpdateProductWordpressId } from '@/services/SalesService'
import { updateWooProductReviews, fetchWooProductBySku } from '@/services/WooService'
import {
    generateNameWithFormat,
    generateReviews,
    generateSingleReview,
    pickReviewText,
    shuffleReviews,
    type NameFormat,
    type ReviewLocale,
} from '@/utils/reviewGenerator'
import { HiOutlineClipboardCopy, HiOutlineRefresh } from 'react-icons/hi'

const ratingOptions = [
    { label: '5', value: 5 },
    { label: '4', value: 4 },
    { label: '3', value: 3 },
]

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '')

const toIsoFromDateInput = (value: string) => {
    if (!value) return ''
    const date = new Date(`${value}T12:00:00`)
    return date.toISOString()
}

type PromptLength = 'short' | 'medium' | 'long'
type PromptLanguage = 'en' | 'fr' | 'es' | 'de'

const promptLengthLabels: Record<PromptLength, string> = {
    short: 'Short',
    medium: 'Medium',
    long: 'Long',
}

const promptLanguageLabels: Record<PromptLanguage, string> = {
    en: 'English',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
}

const localeLabels: Record<ReviewLocale, string> = {
    en_US: 'English (US)',
    en_GB: 'English (UK)',
    fr_FR: 'French',
    es_ES: 'Spanish',
    de_DE: 'German',
}

const promptLengthGuidance: Record<PromptLength, string> = {
    short: '1 sentence, 8–20 words.',
    medium: '1–2 sentences, 20–40 words.',
    long: '2–3 sentences, 40–65 words.',
}

const buildPrompt = (
    product: Product,
    review: ReviewDraft,
    index: number,
    length: PromptLength,
    language: PromptLanguage
) => {
    const productName = typeof (product as any).getNameWithCategory === 'function'
        ? (product as any).getNameWithCategory()
        : product.name
    const languageLabel = promptLanguageLabels[language]
    return [
        `Write a short, genuine customer review for a font in ${languageLabel}.`,
        `It should sound like a real person who just used the font—natural, casual, and slightly imperfect.`,
        `Product name: ${productName || 'This font'}.`,
        `Category: ${product.getCategoryName?.() || product.category || 'font'}.`,
        `Target rating: ${review.rating} stars.`,
        `Tone: simple, honest, not salesy.`,
        `No technical details, no SKU, no marketing language.`,
        `You may mention a simple use case (logo, branding, packaging, social post), but keep it minimal.`,
        `Length: ${promptLengthGuidance[length]}`,
        `Sometimes it can be very short, even just “Great, thanks.”`,
        review.text ? `Current draft (rewrite if needed): "${review.text}"` : '',
        `Return only the review text.`,
        `Review #${index + 1}.`,
    ]
        .filter(Boolean)
        .join('\n')
}

const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
    toast.push(<Notification type="success" title={`${label} copied!`} />, { placement: "bottom-start" })
}

const ReviewsForm = ({ mode }: { mode: 'new' | 'edit' }) => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [count, setCount] = useState<number>(values.reviews?.length || 12)
    const initialized = useRef(false)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        if (initialized.current) return
        initialized.current = true
        if (!values.reviews || values.reviews.length === 0) {
            const { reviews, batchId } = generateReviews(values, count)
            setFieldValue('reviews', reviews)
            setFieldValue('reviewSeed', { batchId, createdAt: Date.now() })
        } else {
            setCount(values.reviews.length)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const reviews = values.reviews || []
    const batchId = values.reviewSeed?.batchId

    const usedTexts = useMemo(() => new Set(reviews.map(r => r.text)), [reviews])

    const updateReview = (index: number, patch: Partial<ReviewDraft>) => {
        const next = [...reviews]
        const nextReview = { ...next[index], ...patch }
        if (!patch.source) {
            nextReview.source = 'manual'
        }
        next[index] = nextReview
        setFieldValue('reviews', next)
    }

    const handleGenerate = () => {
        const nextCount = Math.max(1, Math.min(50, Number(count) || 1))
        const { reviews: generated, batchId: newBatchId } = generateReviews(values, nextCount)
        setFieldValue('reviews', generated)
        setFieldValue('reviewSeed', { batchId: newBatchId, createdAt: Date.now() })
        setCount(nextCount)
    }

    const handleShuffle = () => {
        if (!reviews.length) return
        setFieldValue('reviews', shuffleReviews(reviews))
    }

    const handleAdd = () => {
        const next = [...reviews, generateSingleReview(values, usedTexts)]
        setFieldValue('reviews', next)
        setCount(next.length)
    }

    const handleRemove = (index: number) => {
        const next = reviews.filter((_, i) => i !== index)
        setFieldValue('reviews', next)
        setCount(next.length)
    }

    const handleReplaceText = (index: number) => {
        const text = pickReviewText(values, usedTexts)
        updateReview(index, { text, source: 'library' })
    }

    const handleRefreshName = (index: number) => {
        const format = (reviews[index]?.nameFormat || 'first_last_initial') as NameFormat
        const locale = (reviews[index]?.locale || 'en_US') as ReviewLocale
        const { name } = generateNameWithFormat(format, locale)
        updateReview(index, { authorName: name, locale })
    }

    const handleChangeNameFormat = (index: number, format: NameFormat) => {
        const locale = (reviews[index]?.locale || 'en_US') as ReviewLocale
        const { name } = generateNameWithFormat(format, locale)
        updateReview(index, { authorName: name, nameFormat: format, locale })
    }

    const handleChangeLocale = (index: number, locale: ReviewLocale) => {
        const format = (reviews[index]?.nameFormat || 'first_last_initial') as NameFormat
        const { name } = generateNameWithFormat(format, locale)
        updateReview(index, { authorName: name, locale })
    }

    const ratingSummary = useMemo(() => {
        return reviews.reduce(
            (acc, r) => {
                acc[r.rating] = (acc[r.rating] || 0) + 1
                return acc
            },
            {} as Record<number, number>
        )
    }, [reviews])

    const handleUpdateReviewsOnly = async () => {
        if (!values.sku) return
        try {
            setIsUpdating(true)
            let wpId = values.wordpress?.id
            if (!wpId) {
                const found = await fetchWooProductBySku(values.sku)
                if (!found?.id) {
                    toast.push(<Notification type="danger" title="WordPress product not found" />, { placement: "bottom-start" })
                    return
                }
                wpId = found.id
                setFieldValue('wordpress.id', wpId)
                await apiUpdateProductWordpressId(values.sku, wpId)
            }
            const batchId = values.reviewSeed?.batchId || 'fmz-' + Date.now().toString(36)
            const { createdIds } = await updateWooProductReviews(wpId, reviews, batchId)
            const newSeed = {
                batchId,
                createdReviewIds: createdIds,
                createdAt: Date.now(),
            }
            setFieldValue('reviewSeed', newSeed)
            await apiUpdateProductReviews(values.sku, reviews, newSeed)
            toast.push(<Notification type="success" title="Reviews updated" />, { placement: "bottom-start" })
        } catch (err) {
            console.error('Failed to update reviews only:', err)
            toast.push(<Notification type="danger" title="Failed to update reviews" />, { placement: "bottom-start" })
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <AdaptableCard divider className="mb-4">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h5 className="mb-1 text-lg font-semibold">⭐ Reviews</h5>
                    <p className="text-sm text-gray-500">
                        Generate and edit reviews before publishing. You can edit names, ratings, dates, and text.
                    </p>
                </div>
                {batchId && (
                    <div className="text-xs text-gray-500">
                        Batch ID: <span className="font-mono">{batchId}</span>
                    </div>
                )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 mb-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-end">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[160px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Review Count
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={50}
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                            />
                        </div>
                        <Button type="button" variant="solid" onClick={handleGenerate} icon={<HiOutlineRefresh />}>
                            Generate
                        </Button>
                        <Button type="button" variant="twoTone" onClick={handleShuffle} disabled={!reviews.length}>
                            Shuffle Order
                        </Button>
                        <Button type="button" variant="twoTone" onClick={handleAdd}>
                            Add Review
                        </Button>
                        <Button
                            type="button"
                            variant="solid"
                            loading={isUpdating}
                            disabled={mode !== 'edit' || !values.sku}
                            onClick={handleUpdateReviewsOnly}
                        >
                            Update Reviews
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-start xl:justify-end">
                        {([5, 4, 3] as const).map((star) => {
                            const total = reviews.length || 1
                            const countForStar = ratingSummary[star] || 0
                            const pct = Math.round((countForStar / total) * 100)
                            return (
                                <div
                                    key={star}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-sm"
                                >
                                    <span className="text-amber-500 font-semibold">{star}★</span>
                                    <span className="text-gray-700">{countForStar}</span>
                                    <span className="text-gray-400">({pct}%)</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {reviews.map((review, index) => {
                    const prompt = buildPrompt(
                        values,
                        review,
                        index,
                        (review.promptLength || 'medium') as PromptLength,
                        (review.promptLanguage || 'en') as PromptLanguage
                    )
                    return (
                        <div key={review.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-gray-50/60">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        Review {index + 1}
                                    </div>
                                    <div className="text-xs text-gray-400">ID: {review.id.slice(0, 8)}</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="min-w-[130px]">
                                        <Select
                                            options={[
                                                { label: 'Short', value: 'short' },
                                                { label: 'Medium', value: 'medium' },
                                                { label: 'Long', value: 'long' },
                                            ]}
                                            value={{
                                                label: promptLengthLabels[(review.promptLength || 'medium') as PromptLength],
                                                value: (review.promptLength || 'medium') as PromptLength,
                                            }}
                                            onChange={(option) =>
                                                updateReview(index, { promptLength: (option?.value as PromptLength) || 'medium' })
                                            }
                                        />
                                    </div>
                                    <div className="min-w-[140px]">
                                        <Select
                                            options={[
                                                { label: 'English', value: 'en' },
                                                { label: 'French', value: 'fr' },
                                                { label: 'Spanish', value: 'es' },
                                                { label: 'German', value: 'de' },
                                            ]}
                                            value={{
                                                label: promptLanguageLabels[(review.promptLanguage || 'en') as PromptLanguage],
                                                value: (review.promptLanguage || 'en') as PromptLanguage,
                                            }}
                                            onChange={(option) =>
                                                updateReview(index, { promptLanguage: (option?.value as PromptLanguage) || 'en' })
                                            }
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="twoTone"
                                        icon={<HiOutlineClipboardCopy />}
                                        onClick={() => copyToClipboard(prompt, 'Review prompt')}
                                    >
                                        Copy Prompt
                                    </Button>
                                    <Button type="button" size="xs" onClick={() => handleReplaceText(index)}>
                                        Replace Text
                                    </Button>
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="plain"
                                        className="text-red-600"
                                        onClick={() => handleRemove(index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
                                <div className="lg:col-span-4">
                                    <FormItem label="Name">
                                        <div className="flex gap-2">
                                            <Input
                                                value={review.authorName}
                                                onChange={(e) => updateReview(index, { authorName: e.target.value })}
                                            />
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="twoTone"
                                                icon={<HiOutlineRefresh />}
                                                onClick={() => handleRefreshName(index)}
                                            />
                                        </div>
                                        <div className="mt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <Select
                                                    options={[
                                                        { label: 'Firstname L.', value: 'first_last_initial' },
                                                        { label: 'Firstname', value: 'first' },
                                                        { label: 'Firstname Lastname', value: 'first_last' },
                                                    ]}
                                                    value={{
                                                        label:
                                                            review.nameFormat === 'first'
                                                                ? 'Firstname'
                                                                : review.nameFormat === 'first_last'
                                                                ? 'Firstname Lastname'
                                                                : 'Firstname L.',
                                                        value: review.nameFormat || 'first_last_initial',
                                                    }}
                                                    onChange={(option) =>
                                                        handleChangeNameFormat(index, (option?.value as NameFormat) || 'first_last_initial')
                                                    }
                                                />
                                                <Select
                                                    options={[
                                                        { label: 'English (US)', value: 'en_US' },
                                                        { label: 'English (UK)', value: 'en_GB' },
                                                        { label: 'French', value: 'fr_FR' },
                                                        { label: 'Spanish', value: 'es_ES' },
                                                        { label: 'German', value: 'de_DE' },
                                                    ]}
                                                    value={{
                                                        label: localeLabels[(review.locale || 'en_US') as ReviewLocale],
                                                        value: (review.locale || 'en_US') as ReviewLocale,
                                                    }}
                                                    onChange={(option) =>
                                                        handleChangeLocale(index, (option?.value as ReviewLocale) || 'en_US')
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </FormItem>
                                </div>
                                <div className="lg:col-span-2">
                                    <FormItem label="Rating">
                                        <Select
                                            options={ratingOptions}
                                            value={ratingOptions.find(o => o.value === review.rating)}
                                            onChange={(option) =>
                                                updateReview(index, { rating: (option?.value as 3 | 4 | 5) || 5 })
                                            }
                                        />
                                    </FormItem>
                                </div>
                                <div className="lg:col-span-3">
                                    <FormItem label="Date">
                                        <Input
                                            type="date"
                                            value={toDateInput(review.date)}
                                            onChange={(e) => updateReview(index, { date: toIsoFromDateInput(e.target.value) })}
                                        />
                                    </FormItem>
                                </div>
                                <div className="lg:col-span-12">
                                    <FormItem label="Comment">
                                        <Input
                                            textArea
                                            rows={4}
                                            value={review.text}
                                            onChange={(e) => updateReview(index, { text: e.target.value })}
                                        />
                                    </FormItem>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </AdaptableCard>
    )
}

export default ReviewsForm
