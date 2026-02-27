import { useEffect, useMemo, useState } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import { Select, toast } from '@/components/ui'
import Notification from '@/components/ui/Notification'
import Table from '@/components/ui/Table'
import type { Product } from '@/@types/product'
import type { ReviewDraft } from '@/@types/review'
import { apiGetAllProducts, apiMarkReviewsUpdated, apiUpdateProductReviews, apiUpdateProductWordpressId } from '@/services/SalesService'
import { createWooProductReviews, fetchWooProductBySku, fetchWooReviewStats } from '@/services/WooService'
import {
    buildBatchPlan,
    type BatchPreset,
    type Freshness,
    getFreshness,
    generateReviewsForProduct,
    generateSingleReviewForProduct,
} from '@/utils/reviewBatchGenerator'
import { generateNameWithFormat, type NameFormat, type ReviewLocale } from '@/utils/reviewGenerator'

const { Tr, Th, Td, THead, TBody } = Table

type ProductRow = {
    sku: string
    name: string
    wordpressId?: number
    reviewCount: number
    newestReviewDate?: string
    freshness: Freshness
    statsStatus: 'loading' | 'ready' | 'error' | 'missing_id'
}

type BatchPlan = {
    batchId: string
    perProduct: Record<string, ReviewDraft[]>
}

type ProductGenSettings = {
    count: number
}

type StaleFilter = 'all' | 'none' | 'gt30' | 'gt60' | 'gt90' | 'gt180' | 'missing'

const ratingOptions = [
    { label: '5', value: 5 },
    { label: '4', value: 4 },
    { label: '3', value: 3 },
]

const presetOptions = [
    { label: 'Auto (recommended)', value: 'auto' },
    { label: 'Light Freshen (1)', value: 'light' },
    { label: 'Normal Freshen (2–3)', value: 'normal' },
    { label: 'Bestseller Boost (4–6)', value: 'boost' },
]

const staleFilterOptions = [
    { label: 'All products', value: 'all' },
    { label: 'No reviews', value: 'none' },
    { label: 'Stale > 30 days', value: 'gt30' },
    { label: 'Stale > 60 days', value: 'gt60' },
    { label: 'Stale > 90 days', value: 'gt90' },
    { label: 'Very stale > 180 days', value: 'gt180' },
    { label: 'Missing WP ID', value: 'missing' },
]

const formatDate = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toISOString().slice(0, 10)
}

const getAgeDays = (date?: string, reviewCount?: number) => {
    if (!date || !reviewCount) return null
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return null
    return Math.floor((Date.now() - parsed.getTime()) / (24 * 60 * 60 * 1000))
}

const ReviewsManager = () => {
    const [loading, setLoading] = useState(true)
    const [statsLoading, setStatsLoading] = useState(false)
    const [statsProgress, setStatsProgress] = useState({ done: 0, total: 0, errors: 0 })
    const [rows, setRows] = useState<ProductRow[]>([])
    const [productsBySku, setProductsBySku] = useState<Record<string, Product>>({})
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [search, setSearch] = useState('')
    const [staleFilter, setStaleFilter] = useState<StaleFilter>('all')
    const [preset, setPreset] = useState<BatchPreset>('auto')
    const [plan, setPlan] = useState<BatchPlan | null>(null)
    const [pushing, setPushing] = useState(false)
    const [results, setResults] = useState<Record<string, { success: boolean; error?: string }>>({})
    const [settings, setSettings] = useState<Record<string, ProductGenSettings>>({})

    const updateRowStats = (sku: string, patch: Partial<ProductRow>) => {
        setRows(prev => prev.map(r => (r.sku === sku ? { ...r, ...patch } : r)))
    }

    const loadStatsForRows = async (baseRows: ProductRow[]) => {
        const candidates = baseRows.length ? baseRows : rows
        if (!candidates.length) return

        let done = 0
        let errors = 0
        const total = candidates.length
        setStatsLoading(true)
        setStatsProgress({ done: 0, total, errors: 0 })

        const concurrency = 6
        let index = 0
        const runWorker = async () => {
            while (index < candidates.length) {
                const row = candidates[index]
                index += 1
                try {
                    let wordpressId = row.wordpressId
                    if (!wordpressId) {
                        const match = await fetchWooProductBySku(row.sku)
                        if (match?.id) {
                            wordpressId = match.id
                            updateRowStats(row.sku, { wordpressId, statsStatus: 'loading' })
                            setProductsBySku(prev => {
                                const existing = prev[row.sku]
                                if (!existing) return prev
                                return {
                                    ...prev,
                                    [row.sku]: {
                                        ...existing,
                                        wordpress: { ...existing.wordpress, id: wordpressId },
                                    },
                                }
                            })
                            await apiUpdateProductWordpressId(row.sku, wordpressId)
                        } else {
                            updateRowStats(row.sku, { statsStatus: 'missing_id', freshness: 'none' })
                            continue
                        }
                    }

                    const stats = await fetchWooReviewStats(wordpressId!)
                    const freshness = getFreshness(stats.newestReviewDate, stats.reviewCount)
                    updateRowStats(row.sku, {
                        reviewCount: stats.reviewCount,
                        newestReviewDate: stats.newestReviewDate,
                        freshness,
                        statsStatus: 'ready',
                    })
                } catch (err) {
                    errors += 1
                    console.error('Failed to fetch review stats for', row.sku, err)
                    updateRowStats(row.sku, {
                        reviewCount: 0,
                        newestReviewDate: undefined,
                        freshness: 'none',
                        statsStatus: 'error',
                    })
                } finally {
                    done += 1
                    setStatsProgress({ done, total, errors })
                }
            }
        }

        await Promise.all(Array.from({ length: concurrency }, runWorker))
        setStatsLoading(false)
    }

    const statsSummary = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                acc.total += 1
                if (row.statsStatus === 'ready') {
                    acc.ready += 1
                    acc.freshness[row.freshness] = (acc.freshness[row.freshness] || 0) + 1
                } else if (row.statsStatus === 'loading') {
                    acc.loading += 1
                } else if (row.statsStatus === 'missing_id') {
                    acc.missing += 1
                } else if (row.statsStatus === 'error') {
                    acc.error += 1
                }
                return acc
            },
            {
                total: 0,
                ready: 0,
                loading: 0,
                missing: 0,
                error: 0,
                freshness: {} as Record<Freshness, number>,
            }
        )
    }, [rows])

    useEffect(() => {
        let active = true
        ;(async () => {
            setLoading(true)
            try {
                let products: Product[] = []
                try {
                    products = await apiGetAllProducts()
                } catch (err) {
                    console.error('Failed to load products', err)
                    toast.push(
                        <Notification type="danger" title="Failed to load products" />,
                        { placement: 'bottom-start' }
                    )
                    return
                }
                const filtered = products
                const map: Record<string, Product> = {}
                filtered.forEach(p => { map[p.sku] = p })

                const baseRows: ProductRow[] = filtered.map(product => ({
                    sku: product.sku,
                    name: product.getNameWithCategory?.() || product.name,
                    wordpressId: product.wordpress?.id,
                    reviewCount: 0,
                    newestReviewDate: undefined,
                    freshness: 'none',
                    statsStatus: product.wordpress?.id ? 'loading' : 'missing_id',
                }))

                if (!active) return
                setProductsBySku(map)
                setRows(baseRows)
                setLoading(false)
                await loadStatsForRows(baseRows)
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => {
            active = false
        }
    }, [])

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter(r => {
            const matchesSearch = q ? r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) : true
            if (!matchesSearch) return false
            if (staleFilter === 'all') return true
            if (staleFilter === 'missing') return r.statsStatus === 'missing_id'
            if (r.statsStatus !== 'ready') return false
            if (staleFilter === 'none') return r.reviewCount === 0 || !r.newestReviewDate

            const age = getAgeDays(r.newestReviewDate, r.reviewCount)
            if (age == null) return false
            if (staleFilter === 'gt30') return age > 30
            if (staleFilter === 'gt60') return age > 60
            if (staleFilter === 'gt90') return age > 90
            if (staleFilter === 'gt180') return age > 180
            return true
        })
    }, [rows, search, staleFilter])

    const selectedSkus = Object.keys(selected).filter(k => selected[k])

    const refreshStats = async () => {
        await loadStatsForRows([])
    }

    const toggleSelectAll = (checked: boolean) => {
        const next = { ...selected }
        filteredRows.forEach(r => { next[r.sku] = checked })
        setSelected(next)
    }

    const handleGeneratePreview = () => {
        const selectedProducts = selectedSkus
            .map(sku => productsBySku[sku])
            .filter(Boolean)

        const statsMap: Record<string, { newestReviewDate?: string; reviewCount: number }> = {}
        rows.forEach(r => { statsMap[r.sku] = { newestReviewDate: r.newestReviewDate, reviewCount: r.reviewCount } })

        const batch = buildBatchPlan(selectedProducts, statsMap, preset)
        setPlan(batch)
        setResults({})
        const nextSettings: Record<string, ProductGenSettings> = {}
        Object.entries(batch.perProduct).forEach(([sku, reviews]) => {
            nextSettings[sku] = { count: reviews.length }
        })
        setSettings(nextSettings)
    }

    const updateReview = (sku: string, index: number, patch: Partial<ReviewDraft>) => {
        if (!plan) return
        const next = { ...plan.perProduct }
        const list = [...(next[sku] || [])]
        list[index] = { ...list[index], ...patch, source: 'manual' }
        next[sku] = list
        setPlan({ ...plan, perProduct: next })
    }

    const removeReview = (sku: string, index: number) => {
        if (!plan) return
        const next = { ...plan.perProduct }
        next[sku] = (next[sku] || []).filter((_, i) => i !== index)
        setPlan({ ...plan, perProduct: next })
    }

    const addReview = (sku: string) => {
        if (!plan) return
        const product = productsBySku[sku]
        if (!product) return
        const next = { ...plan.perProduct }
        const generated = generateSingleReviewForProduct(product)
        next[sku] = [...(next[sku] || []), generated]
        setPlan({ ...plan, perProduct: next })
        setSettings(prev => ({
            ...prev,
            [sku]: {
                count: (prev[sku]?.count || 0) + 1,
            } as ProductGenSettings,
        }))
    }

    const shuffleProduct = (sku: string) => {
        if (!plan) return
        const product = productsBySku[sku]
        if (!product) return
        const count = settings[sku]?.count ?? (plan.perProduct[sku]?.length || 0)
        if (!count) return
        const next = { ...plan.perProduct }
        next[sku] = generateReviewsForProduct(product, count)
        setPlan({ ...plan, perProduct: next })
    }

    const updateSetting = (sku: string, patch: Partial<ProductGenSettings>) => {
        setSettings(prev => ({
            ...prev,
            [sku]: {
                count: prev[sku]?.count || 0,
                ...patch,
            },
        }))
    }

    const regenerateForProduct = (sku: string) => {
        if (!plan) return
        const product = productsBySku[sku]
        if (!product) return
        const count = Math.max(0, settings[sku]?.count ?? 0)
        const next = { ...plan.perProduct }
        next[sku] = generateReviewsForProduct(product, count)
        setPlan({ ...plan, perProduct: next })
    }

    const refreshReviewName = (sku: string, index: number) => {
        if (!plan) return
        const review = plan.perProduct[sku]?.[index]
        if (!review) return
        const format = (review.nameFormat || 'first_last_initial') as NameFormat
        const locale = (review.locale || 'en_US') as ReviewLocale
        const generated = generateNameWithFormat(format, locale)
        updateReview(sku, index, { authorName: generated.name, nameFormat: generated.format, locale: generated.locale })
    }

    const changeReviewNameFormat = (sku: string, index: number, format: NameFormat) => {
        if (!plan) return
        const review = plan.perProduct[sku]?.[index]
        if (!review) return
        const locale = (review.locale || 'en_US') as ReviewLocale
        const generated = generateNameWithFormat(format, locale)
        updateReview(sku, index, { authorName: generated.name, nameFormat: format, locale: generated.locale })
    }

    const changeReviewLocale = (sku: string, index: number, locale: ReviewLocale) => {
        if (!plan) return
        const review = plan.perProduct[sku]?.[index]
        if (!review) return
        const format = (review.nameFormat || 'first_last_initial') as NameFormat
        const generated = generateNameWithFormat(format, locale)
        updateReview(sku, index, { authorName: generated.name, nameFormat: generated.format, locale: generated.locale })
    }

    const handlePush = async () => {
        if (!plan) return
        setPushing(true)
        const nextResults: Record<string, { success: boolean; error?: string }> = {}
        try {
            for (const [sku, reviews] of Object.entries(plan.perProduct)) {
                const product = productsBySku[sku]
                if (!product?.wordpress?.id) {
                    nextResults[sku] = { success: false, error: 'Missing WordPress ID' }
                    continue
                }
                try {
                    const createdIds = await createWooProductReviews(product.wordpress.id, reviews, plan.batchId)
                    const seed = {
                        batchId: plan.batchId,
                        createdReviewIds: createdIds,
                        createdAt: Date.now(),
                    }
                    await apiUpdateProductReviews(sku, reviews, seed)
                    await apiMarkReviewsUpdated(sku, seed)
                    nextResults[sku] = { success: true }
                } catch (err: any) {
                    nextResults[sku] = { success: false, error: err?.message || 'Failed to push reviews' }
                }
            }
            setResults(nextResults)
            toast.push(<Notification type="success" title="Batch push completed" />, { placement: 'bottom-start' })
        } finally {
            setPushing(false)
        }
    }

    return (
        <div className="space-y-6">
            <AdaptableCard divider>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                        <h5 className="text-lg font-semibold">Product Reviews Manager</h5>
                        <p className="text-sm text-gray-500">
                            Batch-generate and publish fresh reviews where needed.
                        </p>
                    </div>
                    <div className="min-w-[220px]">
                        <Select
                            options={presetOptions}
                            value={presetOptions.find(p => p.value === preset)}
                            onChange={(opt) => setPreset((opt?.value as BatchPreset) || 'auto')}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-4 mb-4">
                    <div className="min-w-[240px] flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                        <Input
                            placeholder="Search by name or SKU"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="min-w-[220px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Filter</label>
                        <Select
                            options={staleFilterOptions}
                            value={staleFilterOptions.find(opt => opt.value === staleFilter)}
                            onChange={(opt) => setStaleFilter((opt?.value as StaleFilter) || 'all')}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {statsLoading ? (
                            <>
                                <Spinner size="sm" />
                                <span>Loading stats {statsProgress.done}/{statsProgress.total}</span>
                            </>
                        ) : (
                            <span>
                                Ready {statsSummary.ready}/{statsSummary.total}
                            </span>
                        )}
                        {statsSummary.missing > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                                No WP ID: {statsSummary.missing}
                            </span>
                        )}
                        {statsSummary.error > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
                                Errors: {statsSummary.error}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button size="sm" variant="twoTone" onClick={refreshStats} disabled={statsLoading || !rows.length}>
                            Refresh stats
                        </Button>
                        <Button
                            variant="solid"
                            disabled={!selectedSkus.length}
                            onClick={handleGeneratePreview}
                        >
                            Freshen Reviews
                        </Button>
                    </div>
                </div>
                {staleFilter !== 'all' && statsLoading && (
                    <div className="text-xs text-amber-600 mb-3">
                        Filters update as stats load. If results look empty, wait for stats or click “Refresh stats”.
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Spinner size="sm" />
                        <span>Loading products…</span>
                    </div>
                ) : (
                    <>
                        <Table>
                            <THead>
                                <Tr>
                                    <Th className="w-[40px]">
                                        <input
                                            type="checkbox"
                                            checked={filteredRows.length > 0 && filteredRows.every(r => selected[r.sku])}
                                            onChange={(e) => toggleSelectAll(e.target.checked)}
                                        />
                                    </Th>
                                    <Th>Product</Th>
                                    <Th className="w-[140px]">Reviews</Th>
                                    <Th className="w-[160px]">Newest</Th>
                                    <Th className="w-[140px]">Freshness</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {filteredRows.map(row => {
                                    const ageDays = getAgeDays(row.newestReviewDate, row.reviewCount)
                                    return (
                                    <Tr key={row.sku}>
                                        <Td>
                                            <input
                                                type="checkbox"
                                                checked={!!selected[row.sku]}
                                                onChange={(e) =>
                                                    setSelected(prev => ({ ...prev, [row.sku]: e.target.checked }))
                                                }
                                            />
                                        </Td>
                                        <Td>
                                            <div className="font-medium">{row.name}</div>
                                            <div className="text-xs text-gray-500">{row.sku}</div>
                                        </Td>
                                        <Td>{row.reviewCount}</Td>
                                        <Td>{formatDate(row.newestReviewDate)}</Td>
                                        <Td>
                                            <span className="text-sm">
                                                {row.statsStatus === 'loading' && 'Loading'}
                                                {row.statsStatus === 'error' && 'Error'}
                                                {row.statsStatus === 'missing_id' && 'No WP ID'}
                                                {row.freshness === 'ok' && 'OK'}
                                                {row.freshness === 'stale' && 'Stale'}
                                                {row.freshness === 'very_stale' && 'Very Stale'}
                                                {row.freshness === 'none' && 'None'}
                                            </span>
                                            {row.statsStatus === 'ready' && row.reviewCount > 0 && ageDays != null && (
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {ageDays}d
                                                </span>
                                            )}
                                        </Td>
                                    </Tr>
                                    )
                                })}
                            </TBody>
                        </Table>
                        {filteredRows.length === 0 && (
                            <div className="text-sm text-gray-500 mt-3">
                                No products match this filter. If stats are still loading, try again after they finish or click “Refresh stats”.
                            </div>
                        )}
                    </>
                )}
            </AdaptableCard>

            {plan && (
                <AdaptableCard divider>
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h6 className="text-base font-semibold">Preview Batch</h6>
                            <p className="text-sm text-gray-500">Batch ID: {plan.batchId}</p>
                        </div>
                        <Button variant="solid" loading={pushing} onClick={handlePush}>
                            Push Reviews
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {Object.entries(plan.perProduct).map(([sku, reviews]) => {
                            const product = productsBySku[sku]
                            if (!product) return null
                            return (
                                <div key={sku} className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <div>
                                            <div className="font-semibold">{product.getNameWithCategory?.() || product.name}</div>
                                            <div className="text-xs text-gray-500">{sku}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                        <div className="min-w-[120px]">
                                            <label className="text-xs text-gray-500">Count</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={10}
                                                value={settings[sku]?.count ?? reviews.length}
                                                onChange={(e) =>
                                                    updateSetting(sku, { count: Math.max(0, Number(e.target.value) || 0) })
                                                }
                                            />
                                        </div>
                                        <Button size="sm" onClick={() => addReview(sku)}>Add</Button>
                                        <Button size="sm" variant="twoTone" onClick={() => regenerateForProduct(sku)}>
                                            Regenerate
                                        </Button>
                                        {results[sku] && (
                                            <span className={`text-xs ${results[sku].success ? 'text-green-600' : 'text-red-600'}`}>
                                                {results[sku].success ? 'Pushed' : results[sku].error}
                                            </span>
                                        )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {reviews.map((review, index) => (
                                            <div key={review.id} className="rounded-md border border-gray-200 bg-white p-3">
                                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs text-gray-500">Name</label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={review.authorName}
                                                                onChange={(e) => updateReview(sku, index, { authorName: e.target.value })}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="twoTone"
                                                                onClick={() => refreshReviewName(sku, index)}
                                                            >
                                                                Refresh
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                            <div>
                                                                <label className="text-xs text-gray-500">Name Format</label>
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
                                                                    onChange={(opt) =>
                                                                        changeReviewNameFormat(
                                                                            sku,
                                                                            index,
                                                                            (opt?.value as NameFormat) || 'first_last_initial'
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-500">Nationality</label>
                                                                <Select
                                                                    options={[
                                                                        { label: 'English (US)', value: 'en_US' },
                                                                        { label: 'English (UK)', value: 'en_GB' },
                                                                        { label: 'French', value: 'fr_FR' },
                                                                        { label: 'Spanish', value: 'es_ES' },
                                                                        { label: 'German', value: 'de_DE' },
                                                                    ]}
                                                                    value={{
                                                                        label:
                                                                            review.locale === 'en_GB'
                                                                                ? 'English (UK)'
                                                                                : review.locale === 'fr_FR'
                                                                                ? 'French'
                                                                                : review.locale === 'es_ES'
                                                                                ? 'Spanish'
                                                                                : review.locale === 'de_DE'
                                                                                ? 'German'
                                                                                : 'English (US)',
                                                                        value: review.locale || 'en_US',
                                                                    }}
                                                                    onChange={(opt) =>
                                                                        changeReviewLocale(
                                                                            sku,
                                                                            index,
                                                                            (opt?.value as ReviewLocale) || 'en_US'
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <label className="text-xs text-gray-500">Rating</label>
                                                        <Select
                                                            options={ratingOptions}
                                                            value={ratingOptions.find(o => o.value === review.rating)}
                                                            onChange={(opt) =>
                                                                updateReview(sku, index, { rating: (opt?.value as 3 | 4 | 5) || 5 })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs text-gray-500">Date</label>
                                                        <Input
                                                            type="date"
                                                            value={review.date.slice(0, 10)}
                                                            onChange={(e) =>
                                                                updateReview(sku, index, {
                                                                    date: new Date(`${e.target.value}T12:00:00`).toISOString(),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="md:col-span-1 flex items-end justify-end">
                                                        <Button
                                                            size="sm"
                                                            variant="plain"
                                                            className="text-red-600"
                                                            onClick={() => removeReview(sku, index)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                    <div className="md:col-span-6">
                                                        <label className="text-xs text-gray-500">Review</label>
                                                        <Input
                                                            textArea
                                                            rows={3}
                                                            value={review.text}
                                                            onChange={(e) => updateReview(sku, index, { text: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </AdaptableCard>
            )}
        </div>
    )
}

export default ReviewsManager
