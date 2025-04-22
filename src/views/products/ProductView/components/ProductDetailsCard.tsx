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
import { SiEtsy, SiWordpress } from 'react-icons/si'

type Props = {
    product: Product
}

const ProductDetailsCard = ({ product }: Props) => {
    const {
        sku,
        status,
        category,
        etsy,
        publishedOnEtsy,
        publishedOnWebsite,
        computedData,
        wordpressId,
        etsyId,
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

                <IconText icon={publishedOnEtsy ? <HiOutlineCheckCircle className="text-green-500" /> : <HiOutlineXCircle className="text-red-500" />}>
                    <span>Published on Etsy</span>
                </IconText>

                <IconText icon={publishedOnWebsite ? <HiOutlineCheckCircle className="text-green-500" /> : <HiOutlineXCircle className="text-red-500" />}>
                    <span>Published on Website</span>
                </IconText>

                <IconText icon={<SiEtsy className="text-xl opacity-70" />}>
                    <span className="font-semibold">
                        Etsy ID: {etsyId || '—'} <br />
                    </span>
                </IconText>

                <IconText icon={<SiWordpress className="text-xl opacity-70" />}>
                    <span className="font-semibold">
                        WP ID: {wordpressId || '—'}
                    </span>
                </IconText>

                {etsy?.link && (
                    <div className="mt-2 md:col-span-2">
                        <a
                            href={etsy.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 underline text-sm"
                        >
                            <HiOutlineExternalLink />
                            View on Etsy
                        </a>
                    </div>
                )}
            </div>
        </Card>
    )
}

export default ProductDetailsCard
