import { useEffect, useState } from 'react'
import { useFormikContext, Field } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Product } from '@/@types/product'
import Button from '@/components/ui/Button'
import React from 'react'

type Props = {
    slug: string
    showToggle?: boolean
    showMeta?: boolean
    onToggle?: () => void
    className?: string
}

const ThumbnailStudioMetadata = ({ slug, showToggle = true, showMeta, onToggle, className }: Props) => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [localShowMeta, setLocalShowMeta] = useState(false)
    const isOpen = typeof showMeta === 'boolean' ? showMeta : localShowMeta
    const toggleMeta = () => {
        if (onToggle) {
            onToggle()
            return
        }
        setLocalShowMeta(prev => !prev)
    }

    const mainKeyword = typeof values.mainKeyword === 'string'
        ? values.mainKeyword.trim().toLowerCase()
        : 'your font'

    const secondKeyword = typeof values.secondKeyword === 'string'
        ? values.secondKeyword.trim().toLowerCase()
        : 'creative use'

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
                title = `${fontName} Font Preview – Typography Inspired by ${theme} - Designed by FontMaze`
                caption = `Preview of the ${fontName} font by FontMaze.`
                desc = `Discover the full character set of the ${fontName} font in this visual preview. Designed by FontMaze, this font blends aesthetic precision with expressive style. Ideal for crafting, branding, sublimation, and graphic design, it suits any project that needs a touch of originality.`
                break
            case 'characters-preview':
                alt = `Image showing all characters included in the ${fontName} font created by FontMaze.`
                title = `${fontName} Font - Character Set Preview - ${theme} Typography Preview`
                caption = `Character set view of the ${fontName} font, crafted by FontMaze with attention to detail.`
                desc = `See every letter, number, and symbol included in the ${fontName} font. This detailed character set preview shows the design style and completeness of this handcrafted font by FontMaze — ideal for crafting, graphic design, branding, and sublimation projects.`
                break
            case 'included-files':
                alt = `File formats and sizes included with the ${fontName} font by FontMaze.`
                title = `${fontName} Font – Included File Formats (OTF, TTF, SVG, PNG, PDF)`
                caption = `The ${fontName} font comes in OTF, TTF, SVG, PNG, and PDF formats — compatible with all major design tools.`
                desc = `The ${fontName} font includes OTF and TTF installable files, as well as high-resolution SVG, PNG, and PDF formats. Designed by FontMaze, this package ensures compatibility across Cricut, Canva, Silhouette, Adobe, and more — ideal for crafters and designers alike.`
                break
            case 'sentence':
                alt = `Showcase of the ${fontName} font using the sentence 'The quick brown fox jumps over the lazy dog' to display the full alphabet.`
                title = `${fontName} Font – Full Alphabet Preview with Sample Sentence`
                caption = `Full alphabet preview of the ${fontName} font using the classic sentence: ‘The quick brown fox jumps over the lazy dog’.`
                desc = `This preview showcases the entire ${fontName} font alphabet using the well-known sentence 'The quick brown fox jumps over the lazy dog'. Designed by FontMaze, this image provides a clear look at every letter’s shape, spacing, and legibility — ideal for evaluating style and consistency.`
                break
            default:
                alt = `Visual preview of the ${fontName} font in use, styled with a ${theme} theme.`
                title = `${fontName} Font – Styled Preview with ${theme} Theme`
                caption = `Preview of the ${fontName} font designed by FontMaze, styled with a ${theme} look.`
                desc = `This styled preview shows the ${fontName} font in use with a ${theme} theme. Designed by FontMaze, this font is ideal for both personal and commercial projects — offering a clean, creative, and modern look.`
                break
        }

        setFieldValue(`thumbnails.${slug}.metadata.alt`, alt)
        setFieldValue(`thumbnails.${slug}.metadata.title`, title)
        setFieldValue(`thumbnails.${slug}.metadata.caption`, caption)
        setFieldValue(`thumbnails.${slug}.metadata.description`, desc)
    }

    useEffect(() => {
        handleGenerate()
    }, [mainKeyword, secondKeyword, slug])

    return (
        <div className={className ?? "mt-2 mb-2 space-y-4"}>
            {showToggle && (
                <Button type="button" onClick={toggleMeta} className="w-full">
                    {isOpen ? 'Hide Metadata' : '🖋️ Metadata'}
                </Button>
            )}

            {isOpen && (
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

export default React.memo(ThumbnailStudioMetadata, (prev, next) => prev.slug === next.slug)
