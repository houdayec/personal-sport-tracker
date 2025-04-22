import { FC, useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { HiOutlineClipboardCopy, HiOutlineSave } from 'react-icons/hi'
import Notification from '@/components/ui/Notification'
import { Select, toast } from '@/components/ui'
import { EtsyMetadata, Product } from '@/@types/product'
import reducer, {
    getProduct,
    useAppSelector,
    useAppDispatch,
    updateProduct,
} from '../store'
import { showToast } from '@/utils/toastUtils'
import { useLocation, useNavigate } from 'react-router-dom'
import { getRandomProducts } from '@/views/website/ProductReviewsList/store/productListSlice'
import ThumbnailMetadataGenerator from './ThumbnailMetadataGenerator'

type Props = {
    passedProduct: Product
}
const EtsyListingView: FC<Props> = ({ passedProduct }) => {
    const metadata = passedProduct.etsyMetadata
    if (!metadata) return null
    const navigate = useNavigate()

    const [title, setTitle] = useState('')
    const [sku, setSku] = useState('')
    const [description, setDescription] = useState('')
    const [tags, setTags] = useState('')
    const [tagInputs, setTagInputs] = useState<string[]>(Array(13).fill(''))
    const [relatedInputs, setRelatedInputs] = useState<string[]>(Array(10).fill(''))
    const [product, setProduct] = useState<Product | null>(null)
    const [randomProducts, setRandomProducts] = useState<Product[]>([])
    const dispatch = useAppDispatch()
    const [isDescriptionEdited, setIsDescriptionEdited] = useState(false)

    const productData = useAppSelector(
        (state) => state.salesProductEdit.data.product,
    )

    useEffect(() => {
        if (passedProduct.etsyMetadata?.description?.trim()) {
            console.log("🛑 Skipping random product fetch: description already exists in metadata.")
            setDescription(passedProduct.etsyMetadata.description) // set existing description directly
            return
        }

        console.log("Fetching random products for category: football_font")
        dispatch(getRandomProducts({ category: 'football_font', limit: 3 }))
            .unwrap()
            .then((data) => {
                console.log("✅ Random products fetched:", data)
                setRandomProducts(data)

                const text = `🚀 Grow your collection with our other embroidery fonts:\n\n` +
                    data.map((p) => `${p.name} Embroidery Font - ${p.etsy.link || ''}`).join('\n')

                if (passedProduct.etsyMetadata) {
                    console.log("Generating description with metadata:", passedProduct.etsyMetadata)
                    const updatedDescription = generateDescription(
                        passedProduct.etsyMetadata,
                        text,
                        title,
                        passedProduct.name
                    )
                    setDescription(updatedDescription)
                }
            })
            .catch((err) => {
                console.error("❌ Failed to fetch random products", err)
            })
    }, [dispatch, product])


    useEffect(() => {
        if (!metadata) return;

        const fontName = passedProduct?.name || metadata.mainKeyword || '';
        const mainKeyword = metadata.mainKeyword;
        const secondKeyword = metadata.secondKeyword;
        const numberOfSize = passedProduct.embroideryFontData?.sizes?.length ?? 0;

        setSku(productData.sku)

        if (metadata.title && metadata.title.trim()) {
            setTitle(metadata.title);
        } else {
            const extraKeywords = metadata.relatedKeywords
                ?.filter(kw => kw.trim() !== '' && kw !== mainKeyword && kw !== secondKeyword)
                .slice(0, 2)
                .join(', ') || '';

            const keywordSuffix = extraKeywords ? `${secondKeyword}, ${extraKeywords}` : secondKeyword;

            const generatedTitle = `${fontName} Embroidery Font - ${numberOfSize} Sizes - BX, PES + 9 formats - ${mainKeyword} Letters - ${keywordSuffix} Machine Embroidery Alphabet`;

            setTitle(generatedTitle);
        }

        console.log("Initial tag inputs:", metadata.tags)
        if (metadata.tags?.some(tag => tag.trim() !== '')) {
            const initialTags = metadata.tags.map(t => t.trim()).slice(0, 13);
            setTagInputs(Array.from({ length: 13 }, (_, i) => initialTags[i] ?? ''));
        } else {
            const fallbackTags = [
                `${fontName} embroidery`,
                `${secondKeyword} letters`,
                `${mainKeyword} alphabet`,
                'fontmaze',
                'embroidery design',
                'embroidery letters',
                'embroidery alphabet',
                'bx embroidery font',
                'machine embroidery',
                'Bernina Singer files',
                'Brother Janome Pfaff',
                'pes dst exp hus jef',
                'sew shv vip vp3 xxx',
            ].slice(0, 13);

            setTagInputs(fallbackTags);

            // Save fallback tags to DB on first load
            const updatedProduct = new Product({
                ...productData,
                etsyMetadata: {
                    ...metadata,
                    tags: fallbackTags,
                    isGenerated: true,
                },
            });

            updateProduct(updatedProduct).then((success) => {
                if (success) {
                    console.log("✅ Fallback tags saved on first load");
                }
            });
        }
    }, [metadata, passedProduct]);


    useEffect(() => {
        if (!metadata || randomProducts.length === 0 || isDescriptionEdited) return;

        const randomText = "🚀 Grow your collection with our other embroidery fonts:\n\n" +
            randomProducts.map(p => `${p.name} Embroidery Font - ${p.etsy.link || ''}`).join('\n');

        const newDesc = generateDescription(metadata, randomText, title, passedProduct.name);
        setDescription(newDesc);
    }, [title, metadata, randomProducts, isDescriptionEdited])

    // Keep tags string in sync with inputs
    useEffect(() => {
        setTags(tagInputs.filter(Boolean).join(', '))
    }, [tagInputs])

    useEffect(() => {
        const filled = metadata.relatedKeywords ?? []
        setRelatedInputs(prev => prev.map((_, i) => filled[i] || ''))
    }, [metadata])

    const getCharCountClass = (length: number): string => {
        if (length > 140) return 'bg-red-500 text-white px-2 py-1 rounded text-sm inline-block'
        if (length >= 100) return 'bg-emerald-600 text-white px-2 py-1 rounded text-sm inline-block'
        return 'bg-amber-400 text-white px-2 py-1 rounded text-sm inline-block'
    }

    const copyToClipboard = (value: string, label: string) => {
        navigator.clipboard.writeText(value)
        toast.push(<Notification type="success" title={`${label} copied!`} />, { placement: "bottom-start" })
    }

    const handleSave = async () => {
        const updatedMetadata: EtsyMetadata = {
            ...metadata,
            title,
            description,
            tags: tagInputs.filter(Boolean),
            relatedKeywords: relatedInputs.filter(Boolean),
            isGenerated: true,
        };

        const updatedProduct = new Product({
            ...productData,
            etsyMetadata: updatedMetadata,
        })

        setProduct(updatedProduct)

        const success = await updateProduct(updatedProduct)
        if (success) {
            showToast({
                type: 'success',
                title: 'Product Updated',
            })
            navigate(`/products/${updatedProduct.sku}`)
        } else {
            showToast({
                type: 'danger',
                title: 'Product Update Failed',
            })
        }

    };

    const generateDescription = (metadata: EtsyMetadata, randomProductsText: string, title: string, name: string): string => {
        const { gptIntro, mainKeyword } = metadata
        const sizeDetails = metadata.sizesDescription || ''

        return `${gptIntro}
    
⬇️ ALL YOU NEED TO KNOW ⬇️

Formats:
→ BX (Embrilliance Free Software, create and export design using your keyboard)
→ DST (Tajima • Bernina • Pfaff...)
→ EXP (Melco • Bernina • Bravo)
→ HUS (Husqvarna • Viking)
→ JEF (Janome • Elna • Kenmore)
→ PES (Brother • Deco • Babylock • Pfaff...)
→ SEW (Janome • Elna • Kenmore)
→ SHV (Husqvarna • Viking)
→ VIP (Husqvarna • Viking)
→ VP3 (Husqvarna • Viking)
→ XXX (Singer)

${sizeDetails}

✅ Why choose our ${name} Embroidery Font

→ With the BX format, you can use the free Embrilliance software to type words directly using your keyboard and export them as embroidery designs for your machine. It's a real time-saver and well worth your attention. You'll find guides to learning how to use our BX font after your purchase.

→ Each font character is available as an individual machine embroidery file. Simply choose the right format for your embroidery machine and import.

→ The font has been professionally digitized using Hatch Embroidery Digitizer 3. We assure you that it will embroider well and fulfill your expectations. If you need help using this font, don't hesitate to message us!

ℹ️ COMMERCIAL USE LIMITED TO 1 SALE

→ To help you make the most of this font if you buy it for profit, the included license authorizes you to make one product sale using this font.

→ If you make several sales using this font, please purchase our commercial license, which we sell at an affordable price.
https://www.etsy.com/listing/1261024100

Thank you for respecting our work! We do our utmost to offer quality resources at affordable prices, intending to help young designers make a living from their passions.

❌ What is forbidden with our ${name} Embroidery Letters

→ You may not alter the font and claim it as your own.
→ You may not sell the embroidery font as individual letters or alphabet sets.
→ You may not sell or distribute the font files or include the font files in products as a free or paid download.
→ You are responsible for following the terms of use, no compliance might result in legal action.

👍 Things to know before purchasing this ${name} Embroidery Alphabet

→ The digital item will be available for download after your payment.
→ You can also find the download link by clicking on your profile on the top right and then going to the "Purchases" section.
→ The file will be delivered in a zipped/compressed file. After downloading it, you will need to unzip it.
→ Please feel free to contact us if you have any questions or if you have trouble unzipping your files. We will be happy to help you.

📖 Terms & Conditions:

→ You may use these files for personal use and commercial use limited to 1 sale.
→ You may not resell or distribute this item under any circumstances.
→ You may not resize, edit, share, trade, copy, or modify the original item for resale.
→ Due to the nature of the item, no refunds, returns, or exchanges are possible on our digital files.

➕ Extras:

→ Perfect for embroiderers, crafters, creators, and handmade enthusiasts, our embroidery font is ideal for adding a personalized touch to various projects, including garments, accessories, home decor, and gifts for occasions like birthdays, weddings, and special events.
→ This font is versatile for embroidery designs on items like towels, aprons, blankets, bags, hats, and more, allowing for seamless integration into various fabric surfaces.
→ It is compatible with popular embroidery machines such as Brother, Janome, Singer, and more, as well as design software like Embird, Hatch Embroidery, Embrilliance, and Wilcom.

${randomProductsText}

${title.trim() || ''} ©️ FontMaze`
    }

    return (
        <div className="mt-8">
            <h3 className="text-md font-semibold mb-4">Etsy Listing</h3>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold">Title</label>
                    <span className={getCharCountClass(title.length)}>
                        {title.length} / 140 characters
                    </span>
                </div>
                <Input textArea rows={2} value={title} onChange={e => setTitle(e.target.value)} />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copyToClipboard(title, 'Title')}
                >
                    Copy Title
                </Button>
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-semibold">Description</label>
                <Input
                    textArea
                    rows={12}
                    value={description}
                    onChange={e => {
                        setIsDescriptionEdited(true)
                        setDescription(e.target.value)
                    }}
                />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copyToClipboard(description, 'Description')}
                >
                    Copy Description
                </Button>
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold">SKU</label>
                </div>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} readOnly />
                <Button
                    size="sm"
                    className="mt-2"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copyToClipboard(sku, 'SKU')}
                >
                    Copy SKU
                </Button>
            </div>

            <div className="mb-4 mt-8">
                {/* Visual Preview */}
                <h4 className="text-md font-semibold mb-2">Tags</h4>
                <div className="mt-2">
                    <label className="block mb-1 font-semibold flex justify-between items-center">
                        Tag Preview
                        <span
                            className={`text-sm font-semibold ${tagInputs.filter(Boolean).length < 13 ? 'text-red-600' : 'text-emerald-600'
                                }`}
                        >
                            {tagInputs.filter(Boolean).length}/13 Tags
                        </span>
                    </label>
                    <div className="border rounded p-2 bg-gray-50 dark:bg-gray-800 min-h-[48px] flex flex-wrap gap-2">
                        {tagInputs.filter(Boolean).map((tag, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    <Button
                        size="sm"
                        className="mt-2"
                        icon={<HiOutlineClipboardCopy />}
                        onClick={() => {
                            const tagString = tagInputs.filter(Boolean).join(', ')
                            copyToClipboard(tagString, 'Tags')
                        }}
                    >
                        Copy Tags
                    </Button>
                </div>

                {/* Tag Input Grid */}
                <label className="block mb-1 mt-4 font-semibold">Tags</label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {tagInputs.map((tag, idx) => {
                        const charCount = tag.length
                        let color = 'bg-amber-400'
                        if (charCount >= 15 && charCount <= 20) color = 'bg-emerald-500'
                        else if (charCount > 20 || charCount === 0 || charCount <= 10) color = 'bg-red-500'

                        return (
                            <div key={idx}>
                                <Input
                                    value={tag}
                                    size='sm'
                                    onChange={e => {
                                        const updated = [...tagInputs]
                                        updated[idx] = e.target.value
                                        setTagInputs(updated)
                                    }}
                                />
                                <span className={`text-xs mt-1 inline-block px-2 py-1 rounded text-white ${color}`}>
                                    {charCount} chars
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Related Keywords Checker */}
            <div className="mt-8">
                <h4 className="text-md font-semibold mb-2">Related Keywords Checker</h4>
                {metadata.relatedKeywords.filter(keyword => keyword.trim() !== '').length === 0 ? (
                    <div className="text-sm text-gray-500 italic">
                        No related keywords to check.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metadata.relatedKeywords
                            .filter(keyword => keyword.trim() !== '')
                            .map((keyword, idx) => {
                                const inTitle = title.toLowerCase().includes(keyword.toLowerCase())
                                const inDescription = description.toLowerCase().includes(keyword.toLowerCase())
                                const inTags = tagInputs.some(t => t.toLowerCase().includes(keyword.toLowerCase()))

                                const getStatusColor = (exists: boolean) =>
                                    exists ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'

                                return (
                                    <div key={idx} className="border rounded p-3 bg-gray-50 dark:bg-gray-800">
                                        <div className="text-sm font-bold mb-2">{keyword}</div>
                                        <div className="text-sm">
                                            Title: <span className={getStatusColor(inTitle)}>{inTitle ? '✔ Used' : '✘ Not Used'}</span>
                                        </div>
                                        <div className="text-sm">
                                            Description: <span className={getStatusColor(inDescription)}>{inDescription ? '✔ Used' : '✘ Not Used'}</span>
                                        </div>
                                        <div className="text-sm">
                                            Tags: <span className={getStatusColor(inTags)}>{inTags ? '✔ Used' : '✘ Not Used'}</span>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                )}
            </div>


            {/* Save Product Button */}
            <div className="flex justify-end mt-6">
                <Button
                    size="md"
                    className="ml-auto"
                    variant="solid"
                    icon={<HiOutlineSave />}
                    onClick={handleSave}
                >
                    Save Product
                </Button>
            </div>

        </div>
    )
}

export default EtsyListingView
