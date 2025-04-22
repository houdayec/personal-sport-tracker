import { Product } from '@/@types/product'
import Card from '@/components/ui/Card'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import { FaStore } from 'react-icons/fa'

const Chip = ({ label }: { label: string }) => (
    <span className="inline-block bg-orange-100 text-orange-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
        {label}
    </span>
)

const EtsyInfoCard = ({ data }: { data: Product["etsy"] }) => {
    if (!data) return null

    return (
        <Card>
            <h5 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <FaStore className="text-xl text-orange-500" />
                Etsy Listing
            </h5>
            <FormItem label="Title">
                <Input readOnly size="sm" value={data.title} />
            </FormItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <FormItem label="Price">
                    <Input readOnly size="sm" value={`$${data.price} ${data.currency}`} />
                </FormItem>
                <FormItem label="Quantity">
                    <Input readOnly size="sm" value={data.quantity.toString()} />
                </FormItem>
                {data.link && (
                    <FormItem label="Etsy Link">
                        <a
                            href={data.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-sm"
                        >
                            {data.link}
                        </a>
                    </FormItem>
                )}
            </div>

            {Array.isArray(data.tags) && data.tags.filter(t => t.trim() !== '').length > 0 && (
                <FormItem label="Tags" className="mt-4">
                    <div className="border rounded p-2 bg-gray-50 dark:bg-gray-800 min-h-[48px] flex flex-wrap gap-2">
                        {data.tags
                            .filter(tag => tag.trim() !== '')
                            .map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                                >
                                    {tag}
                                </span>
                            ))}
                    </div>
                </FormItem>
            )}


            {Array.isArray(data.materials) && data.materials.filter(m => m.trim() !== '').length > 0 && (
                <FormItem label="Materials" className="mt-2">
                    <div className="border rounded p-2 bg-gray-50 dark:bg-gray-800 min-h-[48px] flex flex-wrap gap-2">
                        {data.materials
                            .filter(m => m.trim() !== '')
                            .map((mat, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                                >
                                    {mat}
                                </span>
                            ))}
                    </div>
                </FormItem>
            )}

        </Card>
    )
}

export default EtsyInfoCard
