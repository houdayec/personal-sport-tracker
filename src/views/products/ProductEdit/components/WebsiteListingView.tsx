import { FC } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { Product } from '@/@types/product'
import { Tabs, toast } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'

type Props = {
    product: Product
}

const WebsiteListingView: FC<Props> = ({ product }) => {
    const website = product.websiteMetadata
    const thumbnail = product.thumbnailsMetadata
    if (!website || !thumbnail) {
        return (
            <div className="text-center py-10 text-gray-500">
                🛠️ You need to generate the listing metadata first to view this section.
            </div>
        )
    }
    const copy = (value: string, label: string) => {
        navigator.clipboard.writeText(value)
        toast.push(<Notification type="success" title={`${label} copied!`} />, { placement: 'bottom-start' })
    }

    return (
        <div className="space-y-6">
            {/* Title */}
            <div>
                <label className="block font-semibold mb-1">Product Title</label>
                <Input value={`${product.name} Embroidery Font - ${product.thumbnailsMetadata?.secondKeyword} Letters`} />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copy(`${product.name} Embroidery Font - ${product.thumbnailsMetadata?.secondKeyword} Letters`, 'Label')}
                >
                    Copy Label
                </Button>
            </div>
            {/* Long Description */}
            <div>
                <label className="block font-semibold mb-1">Long Product Description</label>
                <Tabs defaultValue="raw">
                    <TabList>
                        <TabNav value="raw">Raw HTML</TabNav>
                        <TabNav value="render">Preview</TabNav>
                    </TabList>
                    <TabContent value="raw">
                        <Input textArea readOnly value={website.longDescription} rows={12} />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(website.longDescription, 'Long Description')}
                        >
                            Copy Long Description
                        </Button>
                    </TabContent>
                    <TabContent value="render">
                        <div
                            className="border p-4 bg-gray-50 rounded"
                            dangerouslySetInnerHTML={{ __html: website.longDescription }}
                        />
                    </TabContent>
                </Tabs>
            </div>

            {/* Short Description */}
            <div>
                <label className="block font-semibold mb-1">Short Product Description</label>
                <Tabs defaultValue="raw">
                    <TabList>
                        <TabNav value="raw">Raw HTML</TabNav>
                        <TabNav value="render">Preview</TabNav>
                    </TabList>
                    <TabContent value="raw">
                        <Input textArea readOnly value={website.shortDescription} rows={6} />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(website.shortDescription, 'Short Description')}
                        >
                            Copy Short Description
                        </Button>
                    </TabContent>
                    <TabContent value="render">
                        <div
                            className="border p-4 bg-gray-50 rounded"
                            dangerouslySetInnerHTML={{ __html: website.shortDescription }}
                        />
                    </TabContent>
                </Tabs>
            </div>

            {/* Product Name + SKU */}
            <div>
                <label className="block font-semibold mb-1">Download Label</label>
                <Input readOnly value={`${product.name} - ${product.sku}`} />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copy(`${product.name} - ${product.sku}`, 'Label')}
                >
                    Copy Label
                </Button>
            </div>

            {/* SKU */}
            <div>
                <label className="block font-semibold mb-1">SKU</label>
                <Input readOnly value={product.sku} />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copy(product.sku, 'SKU')}
                >
                    Copy SKU
                </Button>
            </div>

            {/* MPN */}
            <div>
                <label className="block font-semibold mb-1">MPN</label>
                <Input readOnly value={`FONTSTATION-${product.sku}`} />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copy(`FONTSTATION-${product.sku}`, 'MPN')}
                >
                    Copy MPN
                </Button>
            </div>

            {/* Permalink */}
            <div>
                <label className="block font-semibold mb-1">Permalink</label>
                <Input readOnly value={thumbnail.permalink} />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copy(thumbnail.permalink, 'Permalink')}
                >
                    Copy Permalink
                </Button>
            </div>

            {/* Snippet Description */}
            <div>
                <label className="block font-semibold mb-1">Snippet Description</label>
                <Input textArea readOnly value={website.snippetDescription || ''} rows={4} />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copy(website.snippetDescription || '', 'Snippet')}
                >
                    Copy Snippet
                </Button>
            </div>
        </div>
    )
}

export default WebsiteListingView
