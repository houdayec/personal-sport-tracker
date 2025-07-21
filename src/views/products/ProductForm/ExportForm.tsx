import { useEffect, useState } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { fetchWooProductById, listWebpSquareThumbnails, uploadImageToWordPress } from '@/utils/wordpress/generateWordPressHtml'
import _ from 'lodash'
import { useFormikContext } from 'formik'
import { Product } from '@/@types/product'
import { HiCheckCircle } from 'react-icons/hi'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '@/firebase'

// This component fetches a WooCommerce product template, clones and modifies it
const ExportForm = () => {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [thumbnails, setThumbnails] = useState<{ path: string; url: string }[]>([])
    const [uploadedImages, setUploadedImages] = useState<any[]>([])
    const [uploadedStatus, setUploadedStatus] = useState<Record<string, boolean>>({})
    const [clonedProduct, setClonedProduct] = useState<any>(null)
    const { values } = useFormikContext<Product>()

    useEffect(() => {
        const loadTemplate = async () => {
            setLoading(true)

            const template = await fetchWooProductById(7266)
            const base = Array.isArray(template) ? template[0] : template
            if (!template) return setLoading(false)

            const product = _.cloneDeep(base)

            delete product.id
            delete product.date_created
            delete product.date_modified
            delete product.images?.[0]?.id
            delete product.average_rating

            product.name = values.name
            product.slug = values.wordpress?.rankMath?.slug
            product.sku = values.sku
            product.status = 'publish'
            product.short_description = values.wordpress?.excerpt
            product.description = values.wordpress?.content
            product.permalink = values.wordpress?.rankMath?.permalink
            product.purchase_note = ''

            product.meta_data = [
                ...(product.meta_data || []),
                { key: '_custom_mpn', value: `FONTMAZE-${values.sku}` },
                { key: '_fts_uploaded', value: true },
            ]

            const paths = await listWebpSquareThumbnails(values.sku)
            const urls = await Promise.all(
                paths.map(async (path) => ({
                    path,
                    url: await getDownloadURL(ref(storage, path)),
                }))
            )
            setThumbnails(urls)

            setClonedProduct(product)
            setLoading(false)
        }

        loadTemplate()
    }, [])

    const handleUploadThumbnails = async () => {
        setUploading(true)

        const uploaded: any[] = []
        const status: Record<string, boolean> = {}

        for (const { path } of thumbnails) {
            try {
                const media = await uploadImageToWordPress(path)
                if (media) {
                    uploaded.push(media)
                    status[path] = true
                }
            } catch (err) {
                console.error(`[Upload Error] for ${path}`, err)
                status[path] = false
            }
            setUploadedImages([...uploaded])
            setUploadedStatus({ ...status })
        }

        // Prioritize image with "main-" first
        uploaded.sort((a, b) => {
            const aName = a.name ?? ''
            const bName = b.name ?? ''
            return aName.includes('main-') ? -1 : bName.includes('main-') ? 1 : 0
        })

        setClonedProduct((prev: any) => ({
            ...prev,
            images: uploaded,
        }))

        setUploading(false)
    }

    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mb-2 text-lg font-semibold">📤 Export Product</h5>
            <p className="text-sm text-gray-500 mb-6">
                Fetch WordPress template post and prepare export data.
            </p>

            {loading ? (
                <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-sm text-gray-600">Loading template...</span>
                </div>
            ) : (
                <>
                    {thumbnails.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-4">
                            {thumbnails.map(({ path, url }) => (
                                <div key={path} className="relative w-20 h-20 border rounded">
                                    <img
                                        src={url}
                                        alt=""
                                        className="w-full h-full object-cover rounded"
                                    />
                                    {uploadedStatus[path] && (
                                        <HiCheckCircle className="absolute top-0 right-0 text-green-500 bg-white rounded-full" size={16} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Button variant="solid" onClick={handleUploadThumbnails} disabled={uploading || thumbnails.length === 0}>
                            {uploading ? <Spinner size="sm" /> : 'Upload Thumbnails'}
                        </Button>

                        <Button variant="solid" disabled={!clonedProduct || uploading}>
                            Upload to WordPress
                        </Button>
                    </div>
                </>
            )}
        </AdaptableCard>
    )
}

export default ExportForm
