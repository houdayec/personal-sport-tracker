import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import reducer, { injectReducer, useAppDispatch, useAppSelector } from '@/store'
import { getProduct, updateProduct } from '../products/ProductEdit/store'
import { ThumbnailsMetadata, ThumbnailMetadataBlock } from '@/@types/product'
import productReducer from '../products/ProductEdit/store'

/**
 * Generates websiteMetadata for a product and updates only that field
 */
injectReducer('salesProductEdit', productReducer)

const EmbroideryFontThumbnailMetadataGenerator = () => {
    const dispatch = useAppDispatch()

    const [sku, setSku] = useState('')
    const [mainKeyword, setMainKeyword] = useState('')
    const [secondKeyword, setSecondKeyword] = useState('')
    const [comments, setComments] = useState('')

    const product = useAppSelector((state: any) => state.salesProductEdit.data.product)

    useEffect(() => {
        if (sku) {
            dispatch(getProduct({ id: sku }))
        }
    }, [sku, dispatch])

    const buildMetadataBlock = (type: string): ThumbnailMetadataBlock => {
        if (type === 'main') {
            return {
                alt: `Main image of the ${mainKeyword} embroidery font created by FontMaze.`,
                title: `${mainKeyword} Embroidery Font - ${secondKeyword} Embroidery Letters`,
                caption: `Our ${mainKeyword} embroidery font is perfect for your creations`,
                description: `Explore the complete range of letters and alphabets in our ${mainKeyword} embroidery font showcased in this thumbnail preview. This ${secondKeyword} embroidery font is ideal for adding personality to your designs, whether you're stitching monograms, custom gifts, or creative projects with your embroidery machine.`,
            }
        }
        if (type === 'technical') {
            return {
                alt: `Image showing the different files formats, sizes, stitch type and available characters of the ${mainKeyword} Embroidery Font by FontMaze`,
                title: `${mainKeyword} Embroidery Font Formats, Sizes and Characters - BX, DST, EXP, HUS, JEF, PES, SEW, SHV, VIP, VP3, XXX`,
                caption: `Explore the versatility of the ${mainKeyword} embroidery font with this image showcasing different formats: BX, DST, EXP, HUS, JEF, PES, SEW, SHV, VIP, VP3, XXX`,
                description: `${mainKeyword} Embroidery Font Formats, Sizes and Characters - BX, DST, EXP, HUS, JEF, PES, SEW, SHV, VIP, VP3, XXX`,
            }
        }
        if (type === 'picture') {
            return {
                alt: `Image showing a word embroidered on textile using the ${mainKeyword} embroidery font created by FontMaze`,
                title: `Example of letters embroidered with the ${mainKeyword} embroidery font.`,
                caption: `Example of letters embroidered with the ${mainKeyword} embroidery font.`,
                description: `Discover our ${mainKeyword} embroidery font. Our ${secondKeyword} embroidery letters are ready to stitch with your embroidery machine (BX, DST, EXP, HUS, JEF, PES, SEW, SHV, VIP, VP3, XXX)`,
            }
        }
        return { alt: '', title: '', caption: '', description: '' }
    }

    const handleGenerate = () => {
        if (!product) {
            console.warn('Product not found.')
            return
        }

        const permalink = `${mainKeyword}-embroidery-font-${secondKeyword}-letters`.toLowerCase().split(' ').join('-')

        const metadata: ThumbnailsMetadata = {
            permalink,
            comments,
            main: buildMetadataBlock('main'),
            technical: buildMetadataBlock('technical'),
            picture: buildMetadataBlock('picture'),
        }

        dispatch(updateProduct({
            id: product.sku,
            data: { websiteMetadata: metadata },
        }))

        console.log('Updated websiteMetadata:', metadata)
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
            <h2 className="text-lg font-bold mb-4">Thumbnail Metadata Generator</h2>

            <Input type="text" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <Input type="text" placeholder="Main Keyword" value={mainKeyword} onChange={(e) => setMainKeyword(e.target.value)} />
            <Input type="text" placeholder="Second Keyword" value={secondKeyword} onChange={(e) => setSecondKeyword(e.target.value)} />
            <Input type="text" placeholder="Comments" value={comments} onChange={(e) => setComments(e.target.value)} />

            <div className="mt-4">
                <Button onClick={handleGenerate}>Generate Metadata</Button>
            </div>
        </div>
    )
}

export default EmbroideryFontThumbnailMetadataGenerator
