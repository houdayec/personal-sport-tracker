// src/components/ExportForm.tsx

import { useEffect, useState } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { HiCheckCircle, HiTrash, HiXCircle } from 'react-icons/hi'
import { useFormikContext } from 'formik'
import _ from 'lodash'
import { DEFAULT_SLUG_ORDER, Product } from '@/@types/product'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '@/firebase'
import {
    fetchWooProductById,
    listWebpSquareThumbnails,
    uploadImageToWordPress,
    publishWooProduct,
} from '@/services/WooService'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { generateZipFromFirebase, uploadZipToFirebase, uploadZipToWordPress, assignZipToFileBird, exportThumbnailsToFileBird, deleteThumbnailFromStorage } from '@/services/StorageService'

type UploadStatus = 'idle' | 'pending' | 'success' | 'error'

const SortableThumbnail = ({ id, url, status }: { id: string; url: string; status: UploadStatus }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative w-20 h-20 border rounded overflow-hidden"
        >
            <img src={url} className="w-full h-full object-cover" alt={`Thumbnail for ${id}`} />
            {status === 'pending' && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <Spinner size="s" />
                </div>
            )}
            {status === 'success' && (
                <HiCheckCircle className="absolute top-1 right-1 text-green-500 bg-white rounded-full" size={24} />
            )}
            {status === 'error' && (
                <HiXCircle className="absolute top-1 right-1 text-red-500 bg-white rounded-full" size={24} />
            )}
        </div>
    )
}

const ExportForm = () => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [loading, setLoading] = useState(false)
    const [working, setWorking] = useState(false)
    const [thumbnails, setThumbnails] = useState<{ path: string; url: string }[]>([])
    const [statusMap, setStatusMap] = useState<Record<string, UploadStatus>>({})
    const [clonedProduct, setClonedProduct] = useState<any>(null)
    const [step, setStep] = useState<string>('')
    const sensors = useSensors(useSensor(PointerSensor))
    const [wordpressUrls, setWordPressUrls] = useState<{ live: string, edit: string } | null>(null)

    useEffect(() => {
        if (!values.sku) {
            setLoading(false)
            setThumbnails([])
            setClonedProduct(null)
            return
        }

        ; (async () => {
            setLoading(true)
            try {
                const tpl = await fetchWooProductById(7266)
                const base = Array.isArray(tpl) ? tpl[0] : tpl
                if (!base) return

                const product = _.cloneDeep(base)

                delete product.id
                delete product.date_created
                delete product.date_modified
                delete product.total_sales
                delete product.average_rating
                delete product.rating_count
                delete product.review_count
                delete product.tags
                delete product.id
                delete product.date_created
                delete product.date_modified
                delete product.date_created_gmt
                delete product.date_modified_gmt
                delete product.date_on_sale_from
                delete product.date_on_sale_from_gmt
                delete product.date_on_sale_to
                delete product.date_on_sale_to_gmt
                delete product.average_rating
                delete product.images?.[0]?.id
                delete product.total_sales
                delete product.average_rating
                delete product.rating_count
                delete product.review_count
                delete product.related_ids

                Object.assign(product, {
                    name: values.name,
                    slug: values.wordpress?.rankMath?.permalink,
                    sku: values.sku,
                    status: 'publish',
                    short_description: values.wordpress?.excerpt,
                    description: values.wordpress?.content,
                    permalink: values.wordpress?.rankMath?.permalink,
                    purchase_note: '',
                    meta_data: [
                        ...(product.meta_data || []),
                        { key: '_wc_gla_mpn', value: `FONTMAZE-${values.sku}` },
                        { key: '_fts_uploaded', value: true },
                        { key: 'rank_math_focus_keyword', value: values.wordpress?.rankMath?.focusKeyword },
                        { key: 'rank_math_title', value: values.wordpress?.rankMath?.title },
                        { key: 'rank_math_description', value: values.wordpress?.rankMath?.description },
                    ],
                })

                if (values.wordpress?.categoriesIds?.length) {
                    console.log(`✅ Adding categories ${values.wordpress.categoriesIds.join(', ')} to product`)
                    Object.assign(product, {
                        categories: [
                            ...values.wordpress.categoriesIds.map((id: number) => ({ id })),
                        ],
                    });
                }


                const paths = await listWebpSquareThumbnails(values.sku)
                const urls = await Promise.all(
                    paths.map(async path => ({
                        path,
                        url: await getDownloadURL(ref(storage, path)),
                    }))
                )
                setThumbnails(
                    _.sortBy(urls, ({ path }) => {
                        const fileName = path.split('/').pop() || ''
                        const slug = fileName
                            .replace(/\.[^/.]+$/, '')
                            .replace(/^[^-]+-font-[^-]+-font-/, '')
                            .replace(/-square$/, '')
                        return DEFAULT_SLUG_ORDER.indexOf(slug)
                    })
                )
                setClonedProduct(product)
            } catch (err) {
                console.error('Error loading template or thumbnails:', err)
                setThumbnails([])
                setStatusMap({})
                setClonedProduct(null)
            } finally {
                setLoading(false)
            }
        })()
    }, [values.sku])

    const handleDeleteThumbnail = async (path: string) => {
        try {
            await deleteThumbnailFromStorage(path)
            setThumbnails(t => t.filter(item => item.path !== path))

            const slug = path.split('/').pop()?.replace(/\.[^/.]+$/, '')?.replace(/^[^-]+-font-[^-]+-font-/, '')?.replace(/-square$/, '')
            if (slug) {
                setFieldValue(`thumbnails.${slug}`, undefined)
            }

            console.log(`[Delete] ✅ Deleted ${path}`)
        } catch (err) {
            console.error(`[Delete] ❌ Error deleting ${path}`, err)
        }
    }

    // Uploads thumbnails to WP and updates Formik & statusMap
    const uploadThumbnailsStep = async (): Promise<number[]> => {
        console.log('[uploadThumbnailsStep] ▶️')
        const init: Record<string, UploadStatus> = {}
        thumbnails.forEach(t => (init[t.path] = 'pending'))
        setStatusMap(init)

        const mediaIds: number[] = []
        for (const { path } of thumbnails) {
            const fileName = path.split('/').pop() || ''
            const slug = fileName
                .replace(/\.[^/.]+$/, '')
                .replace(/^[^-]+-font-[^-]+-font-/, '')
                .replace(/-square$/, '')
            const meta = (values.thumbnails as any)[slug]?.metadata ?? {}

            try {
                console.log(`[uploadThumbnailsStep] • uploading ${slug}`)
                const media = await uploadImageToWordPress(path, meta)
                mediaIds.push(media.id)

                setFieldValue(`thumbnails.${slug}.wordpressData`, {
                    id: media.id,
                    source_url: media.src,
                    alt_text: meta.alt,
                    title: meta.title,
                    caption: meta.caption,
                    description: meta.description,
                })
                setStatusMap(s => ({ ...s, [path]: 'success' }))
                console.log(`[uploadThumbnailsStep] ✓ ${slug}`)
            } catch (err) {
                console.error(`[uploadThumbnailsStep] ✗ ${slug}`, err)
                setStatusMap(s => ({ ...s, [path]: 'error' }))
            }
        }
        return mediaIds
    }

    // Packages final product files into a ZIP and uploads to Firebase & WP
    const packageStep = async (fbFolderId: number, mediaIds: number[]) => {
        console.log('[packageStep] ▶️ starting packaging')

        // 1️⃣ Generate ZIP blob + name
        setStep('Generating ZIP…')
        const { zipBlob, zipFilename } = await generateZipFromFirebase(
            `products/${values.sku}/files/Final Product`,
            values.sku,
            values.name,
        )
        console.log('[packageStep]   ✓ ZIP generated')

        // 2️⃣ Upload to Firebase
        setStep('Uploading ZIP to Firebase…')
        const firebaseUrl = await uploadZipToFirebase(zipBlob, values.sku, zipFilename)
        console.log('[packageStep]   ✓ uploaded to Firebase')

        // 3️⃣ Upload to WordPress
        setStep('Uploading ZIP to WordPress…')
        const wpZipMedia = await uploadZipToWordPress(zipBlob, zipFilename)
        console.log('[packageStep]   ✓ uploaded to WP (ID:', wpZipMedia.id, ')')

        // 4️⃣ Assign ZIP into FileBird
        setStep('Assigning ZIP in FileBird…')
        await assignZipToFileBird(fbFolderId, wpZipMedia.id)
        console.log('[packageStep]   ✓ assigned to FileBird folder', fbFolderId)

        setStep('Package complete!')
        return { firebaseUrl, wpZipMedia }
    }

    // Orchestrates upload, packaging, and publishing in sequence
    const handleUploadAndPublish = async () => {
        if (!clonedProduct) return
        setWorking(true)
        try {
            setStep('Uploading thumbnails…')
            const mediaIds = await uploadThumbnailsStep()

            setStep('Creating ZIP and uploading…')
            const fbFolder = await exportThumbnailsToFileBird(values.sku, mediaIds, 8)
            const { firebaseUrl, wpZipMedia: customerZipFile } = await packageStep(fbFolder.id, mediaIds)

            setStep('Publishing product…')
            const publishedProduct = await publishWooProduct(
                clonedProduct,
                mediaIds,
                customerZipFile,
            )

            if (publishedProduct?.id) {
                setFieldValue('wordpress.id', publishedProduct.id)
                setFieldValue('publishedOnWebsite', true)
            }

            setWordPressUrls({
                live: publishedProduct.permalink,
                edit: `https://fontmaze.com/wp-admin/post.php?post=${publishedProduct.id}&action=edit`,
            })


            setStep('All done!')
        } catch (err) {
            console.error('[handleUploadAndPublish] ❌', err)
            setStep('Error occurred')
        } finally {
            setWorking(false)
        }
    }

    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mb-2 text-lg font-semibold">📤 Export Product</h5>
            <p className="text-sm text-gray-500 mb-6">
                Fetch WP template, upload thumbnails, package final product…
            </p>

            {loading ? (
                <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-sm text-gray-600">Loading template…</span>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <DndContext
                            collisionDetection={closestCenter}
                            sensors={sensors}
                            onDragEnd={({ active, over }) => {
                                if (active.id !== over?.id) {
                                    const oldIndex = thumbnails.findIndex(t => t.path === active.id)
                                    const newIndex = thumbnails.findIndex(t => t.path === over?.id)
                                    const newOrder = arrayMove(thumbnails, oldIndex, newIndex)
                                    setThumbnails(newOrder)
                                }
                            }}
                        >
                            <SortableContext
                                items={thumbnails.map(t => t.path)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                    {thumbnails.map(({ path, url }) => (
                                        <div key={path} className="relative w-full aspect-square">
                                            <div className="w-full h-full">
                                                <SortableThumbnail
                                                    id={path}
                                                    url={url}
                                                    status={statusMap[path] || 'idle'}
                                                />
                                            </div>
                                            <Button
                                                onClick={() => handleDeleteThumbnail(path)}
                                                type="button"
                                                className="absolute bottom-1 right-1 hover:bg-opacity-100"
                                                size="xs"
                                                disabled={working || thumbnails.length === 0}
                                                icon={<HiTrash />}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                    </div>

                    <p className="mb-2 text-sm text-gray-600">{step}</p>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleUploadAndPublish}
                            type='button'
                            disabled={working || thumbnails.length === 0}
                        >
                            {working ? (
                                <div className="flex items-center justify-center gap-2 w-full">
                                    <Spinner size={16} />
                                    Uploading…
                                </div>
                            ) : (
                                <>Upload</>
                            )}
                        </Button>
                    </div>

                    {wordpressUrls && (
                        <div className="flex gap-3 mt-4">
                            <Button
                                type="button"
                                variant="twoTone"
                                className="w-full"
                                onClick={() => window.open(wordpressUrls.live, '_blank')}
                            >
                                🔗 View on Website
                            </Button>
                            <Button
                                type="button"
                                className="w-full"
                                onClick={() => window.open(wordpressUrls.edit, '_blank')}
                            >
                                ✏️ Edit in WordPress
                            </Button>
                        </div>
                    )}

                </>
            )}
        </AdaptableCard>
    )
}

export default ExportForm
