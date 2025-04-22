import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { HiOutlineClipboardCopy, HiOutlineRefresh } from 'react-icons/hi'
import { Tabs, toast } from '@/components/ui'
import Loading from '@/components/shared/Loading'
import DoubleSidedImage from '@/components/shared/DoubleSidedImage'
import Notification from '@/components/ui/Notification'
import reducer, {
    getProduct,
    useAppSelector,
    useAppDispatch,
    updateProduct,
} from '../store'
import { injectReducer } from '@/store'
import { useLocation } from 'react-router-dom'
import { isEmpty } from 'lodash'
import EtsyListingView from './EtsyListingGeneratorView'
import { EtsyMetadata, Product } from '@/@types/product'
import { StickyFooter } from '@/components/shared'
import { AiOutlineSave } from 'react-icons/ai'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import ListingThumbnailMetadataView from './ListingThumbnailMetadataView'

injectReducer('salesProductEdit', reducer)

const EtsyListingGeneratorHome = () => {
    const [sku, setSku] = useState('')
    const [fontName, setFontName] = useState('')
    const [mainKeyword, setMainKeyword] = useState('')
    const [secondKeyword, setSecondKeyword] = useState('')
    const [relatedKeywords, setRelatedKeywords] = useState(Array(10).fill(''))
    const [prompt, setPrompt] = useState('')
    const [sizesCount, setSizesCount] = useState(0)
    const [sizesDescription, setSizesDescription] = useState('')
    const [introPrompt, setIntroPrompt] = useState('')
    const [gptResponse, setGptResponse] = useState('')
    const [etsyMetadata, setEtsyMetadata] = useState<EtsyMetadata | null>(null)
    const [product, setProduct] = useState<Product | null>(null)
    const [hasEditedKeywords, setHasEditedKeywords] = useState(false)
    const [hasGeneratedKeywords, setHasGeneratedKeywords] = useState(false)

    const dispatch = useAppDispatch()
    const location = useLocation()

    const productData = useAppSelector(
        (state) => state.salesProductEdit.data.product,
    )
    const loading = useAppSelector(
        (state) => state.salesProductEdit.data.loading,
    )

    useEffect(() => {
        const segments = location.pathname.split('/')
        const id = segments[segments.length - 2]
        dispatch(getProduct({ id }))
    }, [location.pathname, dispatch])

    useEffect(() => {
        if (productData) {
            setSku(productData.sku || '')
            setFontName(productData.name || '')
            setMainKeyword(productData.etsyMetadata?.mainKeyword || '')
            setSecondKeyword(productData.etsyMetadata?.secondKeyword || '')
            setGptResponse(productData.etsyMetadata?.gptIntro || '')

            const loadedKeywords = productData.etsyMetadata?.relatedKeywords || []
            const paddedKeywords = [...loadedKeywords].slice(0, 10)
            while (paddedKeywords.length < 10) paddedKeywords.push('')
            setRelatedKeywords(paddedKeywords)

            const sizes = productData.embroideryFontData?.sizes || []
            setSizesCount(sizes.length)

            // Parse sizes like `0.5" (Satin)` → extract inches and label
            const sizeLines = sizes.map((entry) => {
                const inchMatch = entry.match(/([\d.]+)"/)
                const labelMatch = entry.match(/\(([^)]+)\)/)

                const inches = inchMatch ? inchMatch[1] : "?"
                const label = labelMatch ? labelMatch[1] : "Unknown"
                const cm = (parseFloat(inches) * 2.54).toFixed(2)

                return `→ ${inches} in • ${cm} cm • ${label} Stitch`
            })

            const characters = productData.embroideryFontData?.characters || []
            const specials = productData.embroideryFontData?.specialCharacters || []

            const charLines: string[] = []
            if (characters.includes('A-Z')) charLines.push("→ 26 Uppercase Letters A → Z")
            if (characters.includes('a-z')) charLines.push("→ 26 Lowercase Letters a → z")
            if (characters.includes('0-9')) charLines.push("→ 10 Numbers 0 → 9")

            const specialLine = specials.length
                ? `→ ${specials.length} Special Characters\n→ ${specials.join(' ')}`
                : ''

            setSizesDescription(`Sizes:\n${sizeLines.join('\n')}\n\nCharacters:\n${charLines.join('\n')}\n${specialLine}`)
        }
    }, [productData])

    useEffect(() => {
        const newPrompt = `I'm currently creating an embroidery font and I need your help to get highly searched keywords for my font before publishing, to improve SEO and visibility.

Product:
→ ${fontName} embroidery font

Main Keywords:
→ ${mainKeyword}

Secondary Keywords:
→ ${secondKeyword}

Related Keywords:
→ ${relatedKeywords.filter(Boolean).join(", ")}

Give me a list of the 10 most searched keywords related to this topic.
Give me a list of the 5 most searched keywords related to the type of embroidery font (exemple: script, block, modern, vintage, retro, classic...)`

        const introPromptText = `I need you to create a small text (maximum 300 characters) which will be the beginning of our embroidery font description. It has to be natural, appealing and SEO friendly using all the keywords I'm giving to you.

It has to keep those SEO words and make them appear at least once:
→ alphabet, stitch, project, letters, embroidery machine, designs

Product:
→ ${fontName} embroidery font

Related Keywords:
→ ${relatedKeywords.filter(Boolean).join(", ")}

Last time you gave me this for my Farmhouse which I liked:
Introducing our Farmhouse embroidery font – a vintage, handwritten alphabet perfect for adding a trendy, minimalist touch to your farm and country-inspired projects. This skinny, cottage-style font is ready to stitch with your embroidery machine, making it an ideal choice for your next creative project.`

        setPrompt(newPrompt)
        setIntroPrompt(introPromptText)

    }, [fontName, relatedKeywords])

    useEffect(() => {
        if (!loading && !isEmpty(productData)) {
            setProduct(productData)
        }
    }, [productData, loading])

    const handleRelatedKeywordChange = (index: number, value: string) => {
        const updated = [...relatedKeywords]
        updated[index] = value
        setRelatedKeywords(updated)
        setHasGeneratedKeywords(true)
    }

    const copyPrompt = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.push(<Notification type="success" title="Prompt copied!" />, { placement: "bottom-start" })
    }

    return (
        <>
            <Loading loading={loading}>
                {!isEmpty(productData) && (
                    <div className="bg-white">
                        <Tabs defaultValue="generation">
                            <TabList>
                                <TabNav value="generation">Generate</TabNav>
                                <TabNav value="listing" disabled={!product?.etsyMetadata?.isGenerated}>Listing</TabNav>
                                <TabNav value="metadata" disabled={!product?.thumbnailsMetadata}>Metadata</TabNav>
                            </TabList>

                            <div className="p-4">
                                {/* Generation tab content */}
                                <TabContent value="generation">
                                    <h3 className="mb-4 lg:mb-0">Etsy Listing Generator</h3>
                                    <div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block mb-1 font-semibold">SKU</label>
                                                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" />
                                            </div>
                                            <div>
                                                <label className="block mb-1 font-semibold">Font Name</label>
                                                <Input value={fontName} onChange={(e) => setFontName(e.target.value)} placeholder="Font Name" />
                                            </div>
                                            <div>
                                                <label className="block mb-1 font-semibold">Main Keyword</label>
                                                <Input
                                                    value={mainKeyword}
                                                    onChange={(e) => setMainKeyword(e.target.value)}
                                                    onBlur={() => {
                                                        const baseKeywords = [mainKeyword, secondKeyword].filter(Boolean)
                                                        const currentFilled = relatedKeywords.filter(Boolean).length

                                                        if (baseKeywords.length === 0 || currentFilled > 2) return

                                                        const remaining = relatedKeywords.filter(
                                                            (kw) => !baseKeywords.includes(kw)
                                                        )

                                                        const combined = [...baseKeywords, ...remaining].slice(0, 10)
                                                        while (combined.length < 10) combined.push('')

                                                        setRelatedKeywords(combined)
                                                    }}
                                                    placeholder="Main Keyword"
                                                />                            </div>
                                            <div>
                                                <label className="block mb-1 font-semibold">Secondary Keyword</label>

                                                <Input
                                                    value={secondKeyword}
                                                    onChange={(e) => setSecondKeyword(e.target.value)}
                                                    onBlur={() => {
                                                        const baseKeywords = [mainKeyword, secondKeyword].filter(Boolean)
                                                        const currentFilled = relatedKeywords.filter(Boolean).length

                                                        if (baseKeywords.length === 0 || currentFilled > 2) return

                                                        const remaining = relatedKeywords.filter(
                                                            (kw) => !baseKeywords.includes(kw)
                                                        )

                                                        const combined = [...baseKeywords, ...remaining].slice(0, 10)
                                                        while (combined.length < 10) combined.push('')

                                                        setRelatedKeywords(combined)
                                                    }}
                                                    placeholder="Secondary Keyword"
                                                />                            </div>
                                        </div>

                                        <h4 className="text-md font-semibold mt-6 mb-2">All Keywords</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                            {relatedKeywords.map((word, idx) => (
                                                <div key={idx}>
                                                    <label className="block mb-1 text-sm font-semibold">Keyword {idx + 1}</label>
                                                    <Input
                                                        value={word}
                                                        onChange={(e) => handleRelatedKeywordChange(idx, e.target.value)}
                                                        placeholder={`Keyword ${idx + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6">
                                            <label className="block mb-1 font-semibold">Prompt</label>
                                            <div className="relative">
                                                <Input textArea value={prompt} readOnly rows={10} />
                                                <Button
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    icon={<HiOutlineClipboardCopy />}
                                                    onClick={() => copyPrompt(prompt)} // Pass the value here
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block mb-1 font-semibold">Size Count</label>
                                                <Input
                                                    readOnly
                                                    type="number"
                                                    value={sizesCount}
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-1 font-semibold">Sizes & Characters Description</label>
                                                <Input
                                                    textArea
                                                    readOnly
                                                    rows={8}
                                                    value={sizesDescription}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block font-semibold mb-2">Prompt to Generate Introduction</label>
                                            <div className="relative">
                                                <Input textArea value={introPrompt} readOnly rows={6} />
                                                <Button
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    icon={<HiOutlineClipboardCopy />}
                                                    onClick={() => copyPrompt(introPrompt)}
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block font-semibold mb-2">Generated GPT Introduction</label>
                                            <Input textArea value={gptResponse} onChange={e => setGptResponse(e.target.value)} rows={5} />
                                        </div>

                                        <div className="flex justify-end gap-3 mt-4">
                                            {/* Generate or Re-generate Button */}
                                            {!product?.etsyMetadata?.isGenerated ? (
                                                <Button
                                                    variant="solid"
                                                    icon={<HiOutlineRefresh />}
                                                    onClick={async () => {
                                                        const newMetadata: EtsyMetadata = {
                                                            title: '',
                                                            description: '',
                                                            tags: [''],
                                                            mainKeyword,
                                                            secondKeyword,
                                                            relatedKeywords,
                                                            gptIntro: gptResponse,
                                                            sizesDescription,
                                                            isGenerated: true,
                                                        }

                                                        const updatedProduct = new Product({
                                                            ...productData,
                                                            etsyMetadata: newMetadata,
                                                        })

                                                        console.log(updatedProduct)

                                                        setProduct(updatedProduct)
                                                        const success = await updateProduct(updatedProduct)

                                                        toast.push(<Notification type={success ? 'success' : 'danger'} title={success ? "Metadata Generated!" : "Generation Failed"} />, {
                                                            placement: "bottom-start"
                                                        })
                                                    }}
                                                >
                                                    Generate Etsy Listing Metadata
                                                </Button>
                                            ) : (
                                                <>
                                                    {/* Re-generate */}
                                                    <Button
                                                        variant="twoTone"
                                                        icon={<HiOutlineRefresh />}
                                                        onClick={async () => {
                                                            const regeneratedMetadata: EtsyMetadata = {
                                                                title: '',
                                                                description: '',
                                                                tags: [''],
                                                                mainKeyword,
                                                                secondKeyword,
                                                                relatedKeywords,
                                                                gptIntro: gptResponse,
                                                                sizesDescription,
                                                                isGenerated: false,
                                                            }

                                                            const updatedProduct = new Product({
                                                                ...productData,
                                                                etsyMetadata: regeneratedMetadata,
                                                            })

                                                            setProduct(updatedProduct)
                                                            const success = await updateProduct(updatedProduct)

                                                            toast.push(<Notification type={success ? 'success' : 'danger'} title={success ? "Re-generated!" : "Re-generation Failed"} />, {
                                                                placement: "bottom-start"
                                                            })
                                                        }}
                                                    >
                                                        Re-generate Metadata
                                                    </Button>

                                                    {/* Update */}
                                                    <Button
                                                        variant="solid"
                                                        icon={<AiOutlineSave />}
                                                        onClick={async () => {
                                                            const updatedMetadata: EtsyMetadata = {
                                                                title: productData.etsyMetadata?.title ?? '',
                                                                description: productData.etsyMetadata?.description ?? '',
                                                                tags: productData.etsyMetadata?.tags ?? [],
                                                                sizesDescription: productData.etsyMetadata?.sizesDescription ?? '',
                                                                mainKeyword,
                                                                secondKeyword,
                                                                relatedKeywords,
                                                                gptIntro: gptResponse,
                                                                isGenerated: true,
                                                            }
                                                            console.log('Updating metadata...', updatedMetadata)

                                                            const updatedProduct = new Product({
                                                                ...productData,
                                                                etsyMetadata: updatedMetadata,
                                                            })

                                                            setProduct(updatedProduct)
                                                            const success = await updateProduct(updatedProduct)

                                                            toast.push(<Notification type={success ? 'success' : 'danger'} title={success ? "Metadata Updated!" : "Update Failed"} />, {
                                                                placement: "bottom-start"
                                                            })
                                                        }}
                                                    >
                                                        Update Metadata
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </TabContent>

                                {/* Etsy Listing tab content */}
                                <TabContent value="listing">
                                    <div>
                                        {product?.etsyMetadata && (product.etsyMetadata.isGenerated || Object.keys(product.etsyMetadata).length > 0) && (
                                            <EtsyListingView passedProduct={product} />
                                        )}
                                    </div>
                                </TabContent>

                                {/* Placeholder for thumbnail metadata tab */}
                                <TabContent value="metadata">
                                    {product && <ListingThumbnailMetadataView product={product} />}
                                </TabContent>
                            </div>
                        </Tabs>




                    </div>

                )}
            </Loading>
            {!loading && productData.sku == "" && (
                <div className="h-full flex flex-col items-center justify-center">
                    <DoubleSidedImage
                        src="/img/others/img-2.png"
                        darkModeSrc="/img/others/img-2-dark.png"
                        alt="No product found!"
                    />
                    <h3 className="mt-8">No product found!</h3>
                </div>
            )}
        </>
    )
}

export default EtsyListingGeneratorHome
