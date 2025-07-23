import { useEffect, useState } from 'react'
import { useFormikContext, Field } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Product } from '@/@types/product'
import Button from '@/components/ui/Button'

type Props = {
    slug: string
}

const ThumbnailStudioMetadata = ({ slug }: Props) => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [showMeta, setShowMeta] = useState(false)

    const mainKeyword = typeof values.mainKeyword === 'string'
        ? values.mainKeyword.trim().toLowerCase()
        : 'your font'

    const secondKeyword = typeof values.secondKeyword === 'string'
        ? values.secondKeyword.trim().toLowerCase()
        : 'creative use'

    console.log(`[MetaGen:${slug}] Keywords – Main: "${mainKeyword}", Second: "${secondKeyword}"`)

    // Generate metadata based on keywords
    const handleGenerate = () => {
        const fontName = mainKeyword.charAt(0).toUpperCase() + mainKeyword.slice(1)
        const theme = secondKeyword.charAt(0).toUpperCase() + secondKeyword.slice(1)

        let alt = ''
        let title = ''
        let caption = ''
        let desc = ''

        switch (slug) {
            case 'main':
                alt = `Preview showing all characters of the ${fontName} font designed by FontMaze.`
                title = `${fontName} Font Character Map – Typography Inspired by ${theme} by FontMaze`
                caption = `Character preview of the ${fontName} font by FontMaze.`
                desc = `Discover the full character set of the ${fontName} font in this visual preview. Designed by FontMaze, this font blends aesthetic precision with expressive style. Ideal for crafting, branding, sublimation, and graphic design, it suits any project that needs a touch of originality.`
                break

            case 'characters-preview':
                alt = `Image showing all characters available in the ${fontName} font created by FontMaze.`
                title = `${fontName} Font Characters - ${theme} Typography Preview`
                caption = `Available characters in the ${fontName} font made by FontMaze.`
                desc = `Explore the complete character set of the ${fontName} font in this thumbnail preview. With stylish letters and additional elements, this font is perfect for creating sophisticated designs, making it an excellent choice for graphic design, branding, sublimation and other creative projects.`
                break

            case 'included-files':
                alt = `Different Formats and Sizes of ${fontName} Font`
                title = `${fontName} Font Formats and Sizes - OTF, TTF, SVG, PNG, PDF, Various Sizes`
                caption = `Explore the versatility of the ${fontName} font with this image showcasing different formats (OTF, TTF, SVG, PNG, PDF) and various PNG sizes.`
                desc = `${fontName} Font Formats and Sizes - OTF, TTF, SVG, PNG, PDF, Various Sizes`
                break

            case 'sentence':
                alt = `A complete showcase image of the ${fontName} font, featuring the text 'The quick brown fox jumps over the lazy dog' to display every letter of the alphabet.`
                title = `${fontName} Font - Full Alphabet Display with Sentence Example`
                caption = `A complete showcase of the ${fontName} font, featuring the text 'The quick brown fox jumps over the lazy dog' to display every letter of the alphabet.`
                desc = `Explore the full alphabet of the ${fontName} font in this detailed showcase. The image displays the text 'The quick brown fox jumps over the lazy dog,' encompassing every letter and providing a comprehensive view of the font's design and legibility.`
                break

            default:
                alt = `Preview of ${fontName} font in use`
                title = `${fontName} – Modern font style`
                caption = `${fontName} example with ${theme}`
                desc = `This thumbnail highlights ${fontName} font, paired with ${theme}. Perfect for creative or professional use.`
                break
        }

        setFieldValue(`thumbnails.${slug}.metadata.alt`, alt)
        setFieldValue(`thumbnails.${slug}.metadata.title`, title)
        setFieldValue(`thumbnails.${slug}.metadata.caption`, caption)
        setFieldValue(`thumbnails.${slug}.metadata.description`, desc)
    }


    useEffect(() => {
        // Automatically generate metadata when keywords change
        handleGenerate()
    }, [values.mainKeyword, values.secondKeyword])

    return (
        <div className="mt-2 mb-2 space-y-4">
            <Button type="button" onClick={() => setShowMeta(!showMeta)} className="w-full">
                {showMeta ? 'Hide Metadata' : '🖋️ Edit Metadata'}
            </Button>

            {showMeta && (
                <div className="space-y-3">
                    <FormItem label="Alt Text">
                        <Field name={`thumbnails.${slug}.metadata.alt`} component={Input} />
                    </FormItem>
                    <FormItem label="Title">
                        <Field name={`thumbnails.${slug}.metadata.title`} component={Input} />
                    </FormItem>
                    <FormItem label="Caption">
                        <Field name={`thumbnails.${slug}.metadata.caption`} component={Input} />
                    </FormItem>
                    <FormItem label="Description">
                        <Field name={`thumbnails.${slug}.metadata.description`} component={Input} />
                    </FormItem>
                </div>
            )}
        </div>
    )

}

export default ThumbnailStudioMetadata
