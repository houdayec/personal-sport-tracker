import { Product } from '@/@types/product'
import Card from '@/components/ui/Card'
import { FormItem } from '@/components/ui/Form'
import { MdOutlineFontDownload } from 'react-icons/md'

const FontDetailsCard = ({ product }: { product: Product }) => {
    const { embroideryFontData, fontData } = product

    if (!embroideryFontData && !fontData) return null

    const renderChipGroup = (items: string[]) => (
        <div className="border rounded p-2 bg-gray-50 dark:bg-gray-800 min-h-[40px] flex flex-wrap gap-2">
            {items.map((item, idx) => (
                <span
                    key={idx}
                    className="px-2 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                    {item}
                </span>
            ))}
        </div>
    )

    return (
        <Card>
            <h5 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <MdOutlineFontDownload className="text-xl" />
                Font Details
            </h5>

            {embroideryFontData && (
                <>
                    {embroideryFontData.sizes.length > 0 && (
                        <FormItem label={`${embroideryFontData.sizes.length} Sizes`} className="mb-2">
                            {renderChipGroup(embroideryFontData.sizes)}
                        </FormItem>
                    )}
                    {Array.isArray(embroideryFontData.characters) && embroideryFontData.characters.length > 0 && (
                        <FormItem label={`${embroideryFontData.characters.length} Characters`} className="mb-2">
                            {renderChipGroup(embroideryFontData.characters)}
                        </FormItem>
                    )}

                    {Array.isArray(embroideryFontData.specialCharacters) && embroideryFontData.specialCharacters.length > 0 && (
                        <FormItem label={`${embroideryFontData.specialCharacters.length} Special Characters`} className="mb-2">
                            {renderChipGroup(embroideryFontData.specialCharacters)}
                        </FormItem>
                    )}

                </>
            )}
        </Card>
    )
}

export default FontDetailsCard
