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
import { apiGetAllProducts, apiMarkReviewsUpdated } from '@/services/SalesService'
import { createWooProductReviews, fetchWooReviewStats } from '@/services/WooService'
import {
    buildBatchPlan,
    type BatchPreset,
    type Freshness,
    getFreshness,
    generateReviewsForProduct,
} from '@/utils/reviewBatchGenerator'

const { Tr, Th, Td, THead, TBody } = Table

type ProductRow = {
    sku: string
    name: string
    wordpressId?: number
    reviewCount: number
    newestReviewDate?: string
    freshness: Freshness
}

type BatchPlan = {
    batchId: string
    perProduct: Record<string, ReviewDraft[]>
}

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

const formatDate = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toISOString().slice(0, 10)
}

const ReviewsManager = () => {
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<ProductRow[]>([])
    const [productsBySku, setProductsBySku] = useState<Record<string, Product>>({})
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [search, setSearch] = useState('')
    const [filterNone, setFilterNone] = useState(false)
    const [filterStale, setFilterStale] = useState(false)
    const [filterVeryStale, setFilterVeryStale] = useState(false)
    const [preset, setPreset] = useState<BatchPreset>('auto')
    const [plan, setPlan] = useState<BatchPlan | null>(null)
    const [pushing, setPushing] = useState(false)
    const [results, setResults] = useState<Record<string, { success: boolean; error?: string }>>({})

    useEffect(() => {
        let active = true
        ;(async () => {
            setLoading(true)
            try {
                const products = await apiGetAllProducts()
                const filtered = products.filter(p => p.publishedOnWebsite && p.wordpress?.id)
                const map: Record<string, Product> = {}
                filtered.forEach(p => { map[p.sku] = p })

                const statRows: ProductRow[] = []
                for (const product of filtered) {
                    try {
                        const stats = await fetchWooReviewStats(product.wordpress!.id!)
                        const freshness = getFreshness(stats.newestReviewDate, stats.reviewCount)
                        statRows.push({
                            sku: product.sku,
                            name: product.getNameWithCategory?.() || product.name,
                            wordpressId: product.wordpress?.id,
                            reviewCount: stats.reviewCount,
                            newestReviewDate: stats.newestReviewDate,
                            freshness,
                        })
                    } catch (err) {
                        console.error('Failed to fetch review stats for', product.sku, err)
                        statRows.push({
                            sku: product.sku,
                            name: product.getNameWithCategory?.() || product.name,
                            wordpressId: product.wordpress?.id,
                            reviewCount: 0,
                            newestReviewDate: undefined,
                            freshness: 'none',
                        })
                    }
                }

                if (!active) return
                setProductsBySku(map)
                setRows(statRows)
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
        const toggles = [filterNone, filterStale, filterVeryStale].some(Boolean)
        return rows.filter(r => {
            const matchesSearch = q ? r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) : true
            if (!matchesSearch) return false
            if (!toggles) return true
            if (filterNone && r.freshness === 'none') return true
            if (filterStale && r.freshness === 'stale') return true
            if (filterVeryStale && r.freshness === 'very_stale') return true
            return false
        })
    }, [rows, search, filterNone, filterStale, filterVeryStale])

    const selectedSkus = Object.keys(selected).filter(k => selected[k])

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
        const generated = generateReviewsForProduct(product, 1)[0]
        next[sku] = [...(next[sku] || []), generated]
        setPlan({ ...plan, perProduct: next })
    }

    const shuffleProduct = (sku: string) => {
        if (!plan) return
        const product = productsBySku[sku]
        if (!product) return
        const count = plan.perProduct[sku]?.length || 0
        if (!count) return
        const next = { ...plan.perProduct }
        next[sku] = generateReviewsForProduct(product, count)
        setPlan({ ...plan, perProduct: next })
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
                    await apiMarkReviewsUpdated(sku, {
                        batchId: plan.batchId,
                        createdReviewIds: createdIds,
                        createdAt: Date.now(),
                    })
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

                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Input
                        placeholder="Search by name or SKU"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full md:w-[300px]"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={filterNone}
                            onChange={(e) => setFilterNone(e.target.checked)}
                        />
                        No reviews
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={filterStale}
                            onChange={(e) => setFilterStale(e.target.checked)}
                        />
                        Stale &gt; 90 days
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={filterVeryStale}
                            onChange={(e) => setFilterVeryStale(e.target.checked)}
                        />
                        Very stale &gt; 180 days
                    </label>
                    <Button
                        className="ml-auto"
                        variant="solid"
                        disabled={!selectedSkus.length}
                        onClick={handleGeneratePreview}
                    >
                        Freshen Reviews
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Spinner size="sm" />
                        <span>Loading products…</span>
                    </div>
                ) : (
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
                            {filteredRows.map(row => (
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
                                            {row.freshness === 'ok' && 'OK'}
                                            {row.freshness === 'stale' && 'Stale'}
                                            {row.freshness === 'very_stale' && 'Very Stale'}
                                            {row.freshness === 'none' && 'None'}
                                        </span>
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
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
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => addReview(sku)}>Add</Button>
                                            <Button size="sm" variant="twoTone" onClick={() => shuffleProduct(sku)}>Shuffle</Button>
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
                                                        <Input
                                                            value={review.authorName}
                                                            onChange={(e) => updateReview(sku, index, { authorName: e.target.value })}
                                                        />
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
