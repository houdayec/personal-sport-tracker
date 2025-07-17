import { useEffect, useState } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { fetchWooProductById } from '@/utils/wordpress/generateWordPressHtml'
import _ from 'lodash'
import { useFormikContext } from 'formik'
import { Product } from '@/@types/product'

// This component fetches a WooCommerce product template, clones and modifies it
const ExportForm = () => {
    const [loading, setLoading] = useState(false)
    const [clonedProduct, setClonedProduct] = useState(null)
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

            product.name = values.name
            product.slug = values.wordpress?.rankMath?.slug;
            product.sku = values.sku
            product.status = 'publish'
            product.short_description = values.wordpress?.excerpt
            product.description = values.wordpress?.content
            product.permalink = values.wordpress?.rankMath?.permalink
            product.purchase_note = ""

            product.meta_data = [
                ...(product.meta_data || []),
                { key: '_custom_mpn', value: 'FONTMAZE-${values.SKU}' },
                { key: '_fts_uploaded', value: true },
            ]

            setClonedProduct(product)
            console.log('[Modified Woo Product]', product)

            setLoading(false)
        }

        loadTemplate()
    }, [])

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
                <Button variant="solid" disabled={!clonedProduct}>
                    Upload to WordPress
                </Button>
            )}
        </AdaptableCard>
    )
}

export default ExportForm
