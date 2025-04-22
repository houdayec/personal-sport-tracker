import { FC } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { Product } from '@/@types/product'
import { Card, toast } from '@/components/ui'
import { showToast } from '@/utils/toastUtils'

type Props = {
    product: Product
}

const ListingThumbnailMetadataView: FC<Props> = ({ product }) => {
    const copy = (value: string, label: string) => {
        navigator.clipboard.writeText(value)
        showToast({
            type: 'success',
            title: 'Copied!',
        })
    }

    const metadata = product.thumbnailsMetadata
    if (!metadata) return null

    const stringKeys: (keyof Pick<typeof metadata, 'mainKeyword' | 'secondKeyword' | 'permalink' | 'comments'>)[] = [
        'mainKeyword',
        'secondKeyword',
        'permalink',
        'comments',
    ]

    const renderBlock = (label: string, block: { [key: string]: string }) => (
        <Card className="mt-6">
            <h6 className="font-semibold mb-2">{label}</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['alt', 'title', 'caption', 'description'].map((key) => (
                    <div key={key}>
                        <label className="block mb-1 font-medium">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                        <div className="flex gap-2">
                            <Input value={block[key]} readOnly />
                            <Button
                                size="md"
                                icon={<HiOutlineClipboardCopy />}
                                onClick={() => copy(block[key], `${label} ${key}`)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )

    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mt-0">Product Metadata Display</h5>
            <p className="mb-6">Preview and copy your product metadata</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stringKeys.map((key) => (
                    <div key={key}>
                        <label className="block mb-1 font-medium">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                        <div className="flex gap-2">
                            <Input value={metadata[key]} readOnly />
                            <Button
                                size="md"
                                icon={<HiOutlineClipboardCopy />}
                                onClick={() => copy(metadata[key], key)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {renderBlock('Main', metadata.main)}
            {renderBlock('Technical', metadata.technical)}
            {renderBlock('Picture', metadata.picture)}
        </AdaptableCard>
    )
}

export default ListingThumbnailMetadataView
