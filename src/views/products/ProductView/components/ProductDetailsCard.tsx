import {
    HiOutlineTag,
    HiOutlineChartBar,
    HiOutlineClipboardList,
    HiOutlineExternalLink,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
} from 'react-icons/hi'
import Card from '@/components/ui/Card'
import IconText from '@/components/shared/IconText'
import { Product } from '@/@types/product'
import { SiWordpress } from 'react-icons/si' // Removed SiEtsy

type Props = {
    product: Product
}

const ProductDetailsCard = ({ product }: Props) => {
    const {
        sku,
        status,
        category,
        publishedOnWebsite,
        computedData,
    } = product

    return (
        <Card>
            <h5 className="mb-4">Product Info</h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <IconText icon={<HiOutlineTag className="text-xl opacity-70" />}>
                    <span className="font-semibold">{sku}</span>
                </IconText>

                <IconText icon={<HiOutlineTag className="text-xl opacity-70" />}>
                    <span className="capitalize font-semibold">
                        {category.replace(/_/g, ' ')}
                    </span>
                </IconText>

                <IconText icon={<HiOutlineClipboardList className="text-xl opacity-70" />}>
                    <span className="capitalize font-semibold">{status}</span>
                </IconText>

                <IconText icon={<HiOutlineChartBar className="text-xl opacity-70" />}>
                    <span className="font-semibold">
                        {computedData?.numberOfSales ?? 0} sales — ${computedData?.revenue?.toFixed(2) ?? '0.00'}
                    </span>
                </IconText>

                <IconText icon={publishedOnWebsite ? <HiOutlineCheckCircle className="text-green-500" /> : <HiOutlineXCircle className="text-red-500" />}>
                    <span>Published on Website</span>
                </IconText>

                {/* Display WordPress ID */}
                <IconText icon={<SiWordpress className="text-xl opacity-70" />}>
                    <span className="font-semibold">
                        WP ID: {product.wordpress?.id || '—'}
                    </span>
                </IconText>

                {/* New: Link to View on Website */}
                {product.wordpress?.view_url && (
                    <div className="mt-2 md:col-span-2">
                        <a
                            href={product.wordpress.view_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 underline text-sm"
                        >
                            <HiOutlineExternalLink />
                            View on Website
                        </a>
                    </div>
                )}

                {/* New: Link to Edit in WordPress */}
                {product.wordpress?.edit_url && (
                    <div className="mt-2 md:col-span-2">
                        <a
                            href={product.wordpress.edit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 underline text-sm"
                        >
                            <HiOutlineExternalLink />
                            Edit in WordPress
                        </a>
                    </div>
                )}
            </div>
        </Card>
    )
}

export default ProductDetailsCard
