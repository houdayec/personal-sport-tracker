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

// Define the structure for an export step
type ExportStep = {
    id: string;
    label: string;
    status: 'idle' | 'pending' | 'success' | 'error';
    progress?: string; // Optional: for progress like "X/Y"
}

// SortableThumbnail component (no changes to its core logic, only how it's used)
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
            className="relative w-full h-full border rounded overflow-hidden"
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

// Define the initial steps for the export process
const initialExportSteps: ExportStep[] = [
    { id: 'thumbnails', label: 'Uploading thumbnails', status: 'idle', progress: '' },
    { id: 'package', label: 'Creating ZIP and uploading', status: 'idle', progress: '' },
    { id: 'publish', label: 'Publishing product', status: 'idle', progress: '' },
    { id: 'complete', label: 'Finalizing export', status: 'idle', progress: '' },
];


const ExportForm = () => {
    const { values, setFieldValue, submitForm } = useFormikContext<Product>()
    const [loading, setLoading] = useState(false)
    const [working, setWorking] = useState(false) // Indicates if overall export process is active
    const [thumbnails, setThumbnails] = useState<{ path: string; url: string }[]>([])
    const [statusMap, setStatusMap] = useState<Record<string, UploadStatus>>({})
    const [deletingStatus, setDeletingStatus] = useState<Record<string, boolean>>({})
    const [clonedProduct, setClonedProduct] = useState<any>(null)
    const sensors = useSensors(useSensor(PointerSensor))
    const [wordpressUrls, setWordPressUrls] = useState<{ live: string, edit: string } | null>(null)
    const [exportSteps, setExportSteps] = useState<ExportStep[]>(initialExportSteps);
    const [wpZipDownloadUrl, setWpZipDownloadUrl] = useState<string | null>(null); // New state for ZIP download URL


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
                delete product.images
                delete product.featured_media

                Object.assign(product, {
                    name: values.getNameWithCategory(),
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

                if (values.wordpress?.isFeatured) {
                    console.log(`✅ Adding tag 1277 to product`)
                    Object.assign(product, {
                        tags: [{ id: 1277 }],
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
                        const slugIndex = DEFAULT_SLUG_ORDER.findIndex(slug => fileName.includes(slug))
                        return slugIndex === -1 ? DEFAULT_SLUG_ORDER.length : slugIndex
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
        setDeletingStatus(prev => ({ ...prev, [path]: true })) // Set deleting status to true
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
        } finally {
            setDeletingStatus(prev => ({ ...prev, [path]: false })) // Set deleting status to false
        }
    }

    // Helper to update a specific step's status and progress
    const updateExportStep = (id: string, status: ExportStep['status'], progress?: string) => {
        setExportSteps(prevSteps =>
            prevSteps.map(step =>
                step.id === id ? { ...step, status, progress: progress !== undefined ? progress : step.progress } : step
            )
        );
    };

    // Uploads thumbnails to WP and updates Formik & statusMap
    const uploadThumbnailsStep = async (): Promise<number[]> => {
        console.log('[uploadThumbnailsStep] ▶️')
        const init: Record<string, UploadStatus> = {}
        thumbnails.forEach(t => (init[t.path] = 'pending'))
        setStatusMap(init) // Set all thumbnails to pending initially

        const mediaIds: number[] = []
        const totalThumbnails = thumbnails.length;
        let uploadedCount = 0;

        for (const { path } of thumbnails) {
            const fileName = path.split('/').pop() || ''
            const slug = fileName
                .replace(/\.[^/.]+$/, '')
                .replace(/^[^-]+-font-[^-]+-font-/, '')
                .replace(/-square$/, '')
            const meta = (values.thumbnails as any)[slug]?.metadata ?? {}

            try {
                console.log(`[uploadThumbnailsStep] • uploading ${slug}`)
                uploadedCount++; // Increment count before upload attempt
                updateExportStep('thumbnails', 'pending', `${uploadedCount}/${totalThumbnails}`); // Update progress
                const media = await uploadImageToWordPress(path, meta)
                mediaIds.push(media.id)

                setFieldValue(`thumbnails.${slug}.wordpressData`, {
                    id: media.id,
                    source_url: media.src,
                    alt_text: meta.alt,
                    title: meta.title,
                    caption: meta.caption,
                    description: meta.description, // Keep original line
                })
                setStatusMap(s => ({ ...s, [path]: 'success' }))
                console.log(`[uploadThumbnailsStep] ✓ ${slug}`)
            } catch (err) {
                console.error(`[uploadThumbnailsStep] ✗ ${slug}`, err)
                setStatusMap(s => ({ ...s, [path]: 'error' }))
                // If one fails, mark the overall step as error, but continue trying others
                updateExportStep('thumbnails', 'error', `${uploadedCount}/${totalThumbnails}`);
            }
        }
        // After loop, check if any thumbnail failed to set overall step status
        const anyThumbnailFailed = Object.values(statusMap).some(status => status === 'error');
        updateExportStep('thumbnails', anyThumbnailFailed ? 'error' : 'success', `${uploadedCount}/${totalThumbnails}`);
        return mediaIds
    }

    // Packages final product files into a ZIP and uploads to Firebase & WP
    const packageStep = async (fbFolderId: number, mediaIds: number[]) => {
        console.log('[packageStep] ▶️ starting packaging')
        updateExportStep('package', 'pending'); // Set step to pending at start

        try {
            updateExportStep('package', 'pending', 'Generating ZIP…');
            const { zipBlob, zipFilename } = await generateZipFromFirebase(
                `products/${values.sku}/files/Final Product`,
                values.sku,
                values.name,
            )
            console.log('[packageStep]   ✓ ZIP generated')

            updateExportStep('package', 'pending', 'Uploading ZIP to Firebase…');
            const firebaseUrl = await uploadZipToFirebase(zipBlob, values.sku, zipFilename)
            console.log('[packageStep]   ✓ uploaded to Firebase')

            updateExportStep('package', 'pending', 'Uploading ZIP to WordPress…');
            const wpZipMedia = await uploadZipToWordPress(zipBlob, zipFilename)
            console.log('[packageStep]   ✓ uploaded to WP (ID:', wpZipMedia.id, ')')

            updateExportStep('package', 'pending', 'Assigning ZIP in FileBird…');
            await assignZipToFileBird(fbFolderId, wpZipMedia.id)
            console.log('[packageStep]   ✓ assigned to FileBird folder', fbFolderId)

            updateExportStep('package', 'success', 'Package complete!');
            // Return wpZipMedia which contains the source_url for download
            return { firebaseUrl, wpZipMedia };
        } catch (err) {
            console.error('[packageStep] ❌', err)
            updateExportStep('package', 'error', 'Packaging failed');
            throw err; // Re-throw to propagate error to main handler
        }
    }

    // Orchestrates upload, packaging, and publishing in sequence
    const handleUploadAndPublish = async () => {
        if (!clonedProduct) return
        setWorking(true)
        setExportSteps(initialExportSteps); // Reset steps for a new run
        setWordPressUrls(null); // Clear previous WordPress URLs
        setWpZipDownloadUrl(null); // Clear previous ZIP download URL

        try {
            // Step 1: Uploading thumbnails
            const mediaIds = await uploadThumbnailsStep()
            const thumbnailsStepStatus = exportSteps.find(s => s.id === 'thumbnails')?.status;
            if (thumbnailsStepStatus === 'error') {
                throw new Error('Thumbnail upload failed.');
            }

            // Step 2: Creating ZIP and uploading
            const fbFolder = await exportThumbnailsToFileBird(values.sku, mediaIds, 8)
            const { firebaseUrl, wpZipMedia: customerZipFile } = await packageStep(fbFolder.id, mediaIds)
            const packageStepStatus = exportSteps.find(s => s.id === 'package')?.status;
            if (packageStepStatus === 'error') {
                throw new Error('Packaging failed.');
            }

            // Store the WordPress ZIP download URL
            if (customerZipFile && customerZipFile.source_url) {
                setWpZipDownloadUrl(customerZipFile.source_url);
            }

            // Step 3: Publishing product
            updateExportStep('publish', 'pending');
            const publishedProduct = await publishWooProduct(
                clonedProduct,
                mediaIds,
                customerZipFile,
            )
            updateExportStep('publish', 'success');

            if (publishedProduct?.id) {
                setFieldValue('wordpress.id', publishedProduct.id)
                setFieldValue('publishedOnWebsite', true)
                setFieldValue('wordpress.view_url', publishedProduct.permalink)
                setFieldValue('wordpress.edit_url', `https://www.fontmaze.com/wp-admin/post.php?post=${publishedProduct.id}&action=edit&classic-editor`)
            }

            setWordPressUrls({
                live: publishedProduct.permalink,
                edit: `https://www.fontmaze.com/wp-admin/post.php?post=${publishedProduct.id}&action=edit&classic-editor`,
            })

            // Step 4: Finalizing
            updateExportStep('complete', 'success', 'All done!');
            submitForm();
        } catch (err) {
            console.error('[handleUploadAndPublish] ❌', err)
            setExportSteps(prevSteps =>
                prevSteps.map(step => {
                    if (step.status === 'pending') {
                        return { ...step, status: 'error' };
                    }
                    return step;
                })
            );
            const currentCompleteStep = exportSteps.find(s => s.id === 'complete');
            if (currentCompleteStep && currentCompleteStep.status !== 'error') {
                updateExportStep('complete', 'error', 'Error occurred');
            }
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
                    <span className="text-sm text-gray-600">Loading template from cloud…</span>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <DndContext
                            collisionDetection={closestCenter}
                            sensors={working ? [] : sensors} // Disable dragging if working
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
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 w-full">
                                    {thumbnails.map(({ path, url }) => {
                                        const fileName = path.split('/').pop() || ''
                                        const slug = fileName
                                            .replace(/\.[^/.]+$/, '')
                                            .replace(/^[^-]+-font-[^-]+-font-/, '')
                                            .replace(/-square$/, '')

                                        const isDeleting = deletingStatus[path] // Check deleting status for this thumbnail
                                        const isThumbnailUploading = statusMap[path] === 'pending'; // Check if this specific thumbnail is uploading

                                        return (
                                            <div key={path} className="flex flex-col items-center">
                                                <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden shadow-md border border-gray-200">
                                                    <SortableThumbnail
                                                        id={path}
                                                        url={url}
                                                        status={statusMap[path] || 'idle'}
                                                    />
                                                    {/* Hide delete button if overall process is working or if this specific thumbnail is deleting/uploading */}
                                                    {!working && !isDeleting && !isThumbnailUploading && (
                                                        <Button
                                                            onClick={() => handleDeleteThumbnail(path)}
                                                            type="button"
                                                            className="absolute top-1 right-1 z-10 bg-red-500 rounded-full p-1 shadow-md hover:bg-red-600 hover:text-white transition-colors duration-200"
                                                            size="xs"
                                                            disabled={thumbnails.length === 0} // Only disable if no thumbnails left
                                                            icon={<HiTrash />}
                                                        />
                                                    )}
                                                    {/* Show spinner on delete button if deleting */}
                                                    {isDeleting && (
                                                        <Button
                                                            type="button"
                                                            className="absolute top-1 right-1 z-10 bg-gray-400/80 text-white rounded-full p-1 shadow-md"
                                                            size="xs"
                                                            disabled={true}
                                                            icon={<Spinner size={16} />}
                                                        />
                                                    )}
                                                    {/* Show spinner on thumbnail if it's individually uploading */}
                                                    {isThumbnailUploading && (
                                                        <div className="absolute top-1 right-1 z-10 bg-gray-400/80 text-white rounded-full p-1 shadow-md flex items-center justify-center">
                                                            <Spinner size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-2 text-sm text-center text-gray-700 font-medium">{slug}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    {/* Step Progress Indicator */}
                    <div className="mb-6">
                        <h6 className="mb-3 text-base font-semibold">Export Progress:</h6>
                        <ul className="space-y-2">
                            {exportSteps.map(step => (
                                <li key={step.id} className="flex items-center gap-2 text-gray-700">
                                    {step.status === 'pending' && <Spinner size={16} className="text-blue-500" />}
                                    {step.status === 'success' && <HiCheckCircle className="text-green-500" size={20} />}
                                    {step.status === 'error' && <HiXCircle className="text-red-500" size={20} />}
                                    {step.status === 'idle' && <span className="w-5 h-5 flex items-center justify-center text-gray-400">•</span>} {/* Bullet for idle */}
                                    <span className={step.status === 'pending' ? 'font-semibold' : ''}>
                                        {step.label} {step.progress && `(${step.progress})`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

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
                                <>📤 Upload & Publish</>
                            )}
                        </Button>
                    </div>

                    {/* WordPress URLs buttons */}
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

                    {wpZipDownloadUrl && (
                        <div className="flex gap-3 mt-4">
                            <Button
                                type="button"
                                variant="solid" // Use solid variant for a more prominent download button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white" // Custom blue color
                                onClick={() => window.open(wpZipDownloadUrl, '_blank')}
                            >
                                ⬇️ Download Generated ZIP
                            </Button>
                        </div>
                    )}
                </>
            )}
        </AdaptableCard>
    )
}

export default ExportForm
