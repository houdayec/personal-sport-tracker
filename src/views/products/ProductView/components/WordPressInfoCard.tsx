import { Product } from '@/@types/product'
import Card from '@/components/ui/Card'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import { FaWordpress } from 'react-icons/fa'
import classNames from 'classnames'

const Chip = ({ label }: { label: string }) => (
    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
        {label}
    </span>
)

const WordPressInfoCard = ({ data }: { data: Product["wordpress"] }) => {
    if (!data) return null

    return (
        <Card>
            <h5 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <FaWordpress className="text-xl text-blue-500" />
                WordPress Listing
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem label="Title">
                    <Input readOnly size="sm" value={data.name || ''} />
                </FormItem>
                <FormItem label="Slug">
                    <Input readOnly size="sm" value={data.slug || ''} />
                </FormItem>
                <FormItem label="Permalink">
                    <Input readOnly size="sm" value={data.permalink || ''} />
                </FormItem>
                <FormItem label="Status">
                    <Input readOnly size="sm" value={data.status || ''} />
                </FormItem>

                {data.link && (
                    <FormItem label="Website Link">
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

            {(data.categories?.length ?? 0) > 0 && (
                <FormItem label="Categories" className="mt-4">
                    <div className="flex flex-wrap">
                        {data.categories!.map((cat, idx) => (
                            <Chip key={idx} label={cat} />
                        ))}
                    </div>
                </FormItem>
            )}

            {(data.tags?.length ?? 0) > 0 && (
                <FormItem label="Tags" className="mt-2">
                    <div className="flex flex-wrap">
                        {data.tags!.map((tag, idx) => (
                            <Chip key={idx} label={tag} />
                        ))}
                    </div>
                </FormItem>
            )}
        </Card>
    )
}

export default WordPressInfoCard
