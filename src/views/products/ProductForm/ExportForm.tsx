// src/components/ExportForm.tsx

import { useEffect, useState } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { HiCheckCircle, HiXCircle } from 'react-icons/hi'
import { useFormikContext } from 'formik'
import _ from 'lodash'
import { Product } from '@/@types/product'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '@/firebase'
import {
    fetchWooProductById,
    listWebpSquareThumbnails,
    uploadImageToWordPress,
    publishWooProduct,
} from '@/services/WooService'
import { generateZipFromFirebase, uploadZipToFirebase, uploadZipToWordPress, assignZipToFileBird, exportThumbnailsToFileBird } from '@/services/StorageService'

type UploadStatus = 'idle' | 'pending' | 'success' | 'error'

const ExportForm = () => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [loading, setLoading] = useState(false)
    const [working, setWorking] = useState(false)
    const [thumbnails, setThumbnails] = useState<{ path: string; url: string }[]>([])
    const [statusMap, setStatusMap] = useState<Record<string, UploadStatus>>({})
    const [clonedProduct, setClonedProduct] = useState<any>(null)
    const [step, setStep] = useState<string>('')

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

                Object.assign(product, {
                    name: values.name,
                    slug: values.wordpress?.rankMath?.slug,
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

                const paths = await listWebpSquareThumbnails(values.sku)
                const urls = await Promise.all(
                    paths.map(async path => ({
                        path,
                        url: await getDownloadURL(ref(storage, path)),
                    }))
                )
                setThumbnails(urls)
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
                setFieldValue('wordpressId', publishedProduct.id)
                setFieldValue('publishedOnWebsite', true)
            }

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
                        {thumbnails.map(({ path, url }) => {
                            const st = statusMap[path] || 'idle'
                            return (
                                <div
                                    key={path}
                                    className="relative w-20 h-20 border rounded overflow-hidden"
                                >
                                    <img
                                        src={url}
                                        className="w-full h-full object-cover"
                                        alt={`Thumbnail for ${path}`}
                                    />
                                    {st === 'pending' && (
                                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                                            <Spinner size="s" />
                                        </div>
                                    )}
                                    {st === 'success' && (
                                        <HiCheckCircle
                                            className="absolute top-1 right-1 text-green-500 bg-white rounded-full"
                                            size={24}
                                        />
                                    )}
                                    {st === 'error' && (
                                        <HiXCircle
                                            className="absolute top-1 right-1 text-red-500 bg-white rounded-full"
                                            size={24}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <p className="mb-2 text-sm text-gray-600">{step}</p>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleUploadAndPublish}
                            type='button'
                            disabled={working || thumbnails.length === 0}
                        >
                            {working ? 'Working…' : 'Start Export'}
                        </Button>
                    </div>
                </>
            )}
        </AdaptableCard>
    )
}

export default ExportForm
