import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import reducer, { injectReducer, useAppDispatch, useAppSelector } from '@/store'
import { getProduct, updateProduct } from '../store'
import { ThumbnailsMetadata, ThumbnailMetadataBlock, Product } from '@/@types/product'
import productReducer from '../store'
import { toast } from '@/components/ui'
import Notification from "@/components/ui/Notification"
import { debounce } from 'lodash'

injectReducer('salesProductEdit', productReducer)

const ThumbnailMetadataGenerator = () => {
    const dispatch = useAppDispatch()

    const [sku, setSku] = useState('')
    const [mainKeyword, setMainKeyword] = useState('')
    const [secondKeyword, setSecondKeyword] = useState('')
    const [comments, setComments] = useState('')
    const [product, setProduct] = useState<Product | null>(null)

    const reduxProduct = useAppSelector((state: any) => state.salesProductEdit.data.product)

    useEffect(() => {
        const segments = location.pathname.split('/')
        const id = segments[segments.length - 2]
        dispatch(getProduct({ id }))
    }, [location.pathname, dispatch])

    useEffect(() => {
        if (reduxProduct) {
            const fullProduct = new Product(reduxProduct)
            setProduct(fullProduct)
            setSku(fullProduct.sku)
            setMainKeyword(fullProduct.thumbnailsMetadata?.mainKeyword || '')
            setSecondKeyword(fullProduct.thumbnailsMetadata?.secondKeyword || '')
            setComments(fullProduct.thumbnailsMetadata?.comments || '')
        }
    }, [reduxProduct])

    const buildMetadataBlock = (type: string): ThumbnailMetadataBlock => {
        if (!mainKeyword || !secondKeyword) return { alt: '', title: '', caption: '', description: '' }

        const desc = `${mainKeyword} font created by FontMaze`

        if (reduxProduct.category === 'football_font') {
            if (type === 'main') {
                return {
                    alt: `Preview image showing all letters, numbers, and symbols included in the ${mainKeyword} font by FontMaze.`,
                    title: `${mainKeyword} Font – Complete ${secondKeyword} Character Set Preview`,
                    caption: `Complete character set featured in the ${mainKeyword} font, designed for football lettering by FontMaze.`,
                    description: `View every letter, number, and symbol in the ${mainKeyword} font. This typeface is perfect for soccer jerseys, football shirts, sports branding, posters, and fan gear.`,
                };
            }

            if (type === 'characters') {
                return {
                    alt: `Full character set preview of the Real ${mainKeyword} font, including all letters, numbers, and symbols.`,
                    title: `${mainKeyword} Font – Complete Character Set with ${secondKeyword} Inspired Typography`,
                    caption: `All available characters in the ${mainKeyword} font, shown in a complete alphabet and number preview.`,
                    description: `This image displays the full set of characters featured in the ${mainKeyword} font, including uppercase letters, numbers, and symbols. Ideal for designers needing a reference for layout, spacing, or visual planning when using this typeface in custom projects.`,
                };
            }

            if (type === 'description') {
                return {
                    alt: `Preview of the ${mainKeyword} font file formats, including OTF, TTF, SVG, PNG, PDF, and multiple size options.`,
                    title: `${mainKeyword} Font – File Formats and Size Variants (OTF, TTF, SVG, PNG, PDF)`,
                    caption: `This image showcases the available formats included with the ${mainKeyword} font.`,
                    description: `Detailed view of the file formats included in the ${mainKeyword} font package. Comes with OTF, TTF, SVG, PNG, and PDF files, along with multiple PNG sizes to support a range of creative and print projects.`,
                }
            }

            if (type === 'preview') {
                return {
                    alt: `Home and away football shirts featuring the ${mainKeyword} font in a sublimated design, showcasing bold and stylish typography.`,
                    title: `${mainKeyword} Font on Home & Away Jerseys – Sublimation Typography Preview`,
                    caption: `Home and away jerseys displaying the ${mainKeyword} font in a bold sublimated design. A visual showcase of the font’s style and versatility.`,
                    description: `A dynamic preview of the ${mainKeyword} font featured on both home and away football shirts. This sublimated mockup highlights the font’s clean lines, perfect for sportswear, branding, or fan-based design projects.`,
                }
            }


        } else if (reduxProduct.category === 'font') {

        }



        return { alt: '', title: '', caption: '', description: '' }
    }

    const handleGenerate = () => {
        if (!product) return

        const permalink = `${mainKeyword}-embroidery-font-${secondKeyword}-letters`.toLowerCase().replace(/\s+/g, '-')

        const metadata: ThumbnailsMetadata = {
            permalink,
            comments,
            mainKeyword: mainKeyword,
            secondKeyword: secondKeyword,
            main: buildMetadataBlock('main'),
            technical: buildMetadataBlock('technical'),
            picture: buildMetadataBlock('picture'),
        }

        const updatedProduct = new Product({
            ...product,
            thumbnailsMetadata: metadata,
        })

        updateProduct(updatedProduct).then((success) => {
            if (success) {
                toast.push(<Notification type="success" title="Metadata generated" />, { placement: "bottom-start" })
                setProduct(updatedProduct)
            } else {
                toast.push(<Notification type="danger" title="Metadata generation failed" />, { placement: "bottom-start" })
            }
        })
    }

    return (
        <div className="bg-white p-6">
            <h2 className="text-lg font-bold mb-6">Thumbnail Metadata Generator</h2>

            {/* Hidden SKU */}
            <div className="hidden">
                <Input type="text" value={sku} disabled />
            </div>

            {/* Main + Second Keyword aligned */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Main Keyword</label>
                    <Input type="text" value={mainKeyword} onChange={(e) => setMainKeyword(e.target.value)} />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Second Keyword</label>
                    <Input type="text" value={secondKeyword} onChange={(e) => setSecondKeyword(e.target.value)} />
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-4">
                {/* Comments Input (left side) */}
                <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium text-gray-700">Comments</label>
                    <Input type="text" value={comments} onChange={(e) => setComments(e.target.value)} />
                </div>

                {/* Button (right side) */}
                <div className="md:mb-0 mt-2 md:mt-0">
                    <Button onClick={handleGenerate}>Generate Metadata</Button>
                </div>
            </div>

        </div>
    )
}

export default ThumbnailMetadataGenerator
