import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import { HiOutlineClipboardCopy, HiOutlineSave, HiSave } from 'react-icons/hi'
import { Product, WebsiteMetadata } from '@/@types/product'
import { useAppSelector, useAppDispatch } from '@/store'
import { updateProduct } from '../store'
import { Tabs, toast } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'

type Props = {
    product: Product
}

const WebsiteListingGenerator = ({ product }: Props) => {
    const dispatch = useAppDispatch()
    const productName = product.name
    const metadata: WebsiteMetadata = product.websiteMetadata || {
        mainKeyword: '',
        secondKeyword: '',
        shortDescIntro: '',
        longDescIntro: '',
        shortDescription: '',
        longDescription: '',
        snippetDescription: '',
    }

    const [shortDescIntroduction, setShortDescriptionIntro] = useState(metadata.shortDescIntro || '')
    const [longDescriptionIntro, setLongDescriptionIntro] = useState(metadata.longDescIntro || '')

    const [shortDescription, setShortDescription] = useState(metadata.shortDescription || '')
    const [longDescription, setLongDescription] = useState(metadata.longDescription || '')

    const [snippetDescription, setSnippetDescription] = useState(metadata.snippetDescription || '')

    const copy = (value: string, label: string) => {
        navigator.clipboard.writeText(value)
        toast.push(<Notification type="success" title={`${label} copied!`} />, { placement: 'bottom-start' })
    }

    const handleSave = async () => {
        const updated: WebsiteMetadata = {
            ...metadata,
            shortDescIntro: shortDescIntroduction,
            longDescIntro: longDescriptionIntro,
            shortDescription: renderShortTemplate(),
            longDescription: renderLongTemplate(),
            snippetDescription: snippetDescription,
        }

        const updatedProduct = new Product({ ...product, websiteMetadata: updated })
        const success = await updateProduct(updatedProduct)

        if (success) {
            toast.push(<Notification type="success" title="Descriptions Saved" />, {
                placement: 'bottom-start'
            })
        }
    }

    const shortPrompt = `As an SEO expert and copyrighting expert, I need you to create a small text (maximum 300 characters) which will be the beginning of our embroidery font description. It has to be natural, appealing and SEO friendly using all the keywords I'm giving to you.

It has to keep those SEO words and make them appear at least once:
→ alphabet, letters, embroidery, design, machine

Product:
→ ${productName} embroidery font

Get inspired by this:
Our Helvetica embroidery font is a clean, modern alphabet designed for machine embroidery. These classic letters are perfect for personalized designs, monograms, and custom stitching projects.`

    const longPrompt = `As an SEO expert and copyrighting expert, I need a short SEO description that will be at the beginning of my ${productName} embroidery font product description.
    It should highlight caracteristics, formats, name. Use SEO terms as embroidery font, letters, alphabet.
Keep it short, important SEO keywords at the beginning at it will be the short snippet shown in Google and used a lot for SEO rankings by Google.
Get inspired by this, but please improve it:

Helvetica embroidery font – a clean, modern alphabet of machine-ready letters. Digitized for sharp, professional embroidery on any fabric, this versatile font is perfect for monograms, logos, and sleek design projects.`

    const snippetDescriptionPrompt = `As an SEO expert, I need you to give me a short snippet description for the ${productName} embroidery font product published on my wordpress website.
It should highlight caracteristics, formats, name. Use SEO terms as embroidery font, letters, alphabet.
Keep it short, important SEO keywords at the beginning at it will be the short snippet shown in Google and used a lot for SEO rankings by Google.

Important: MAX LENGTH OF 160 CHARACTERS.
Get inspired by this, but please improve it:

Helvetica embroidery font – a clean, modern alphabet of machine-ready letters. Available in BX, PES, DST, JEF, and more for smooth stitching across all your embroidery projects.`

    const renderShortTemplate = () => {
        const sizes = product.embroideryFontData?.sizes || []
        const characters = product.embroideryFontData?.characters || []
        const specials = product.embroideryFontData?.specialCharacters || []

        // Group sizes by stitch type
        const groupedSizes: Record<string, string[]> = {}
        sizes.forEach(size => {
            const inchMatch = size.match(/([\d.]+)"/)
            const labelMatch = size.match(/\(([^)]+)\)/)
            const inch = inchMatch?.[1]
            const stitch = labelMatch?.[1] || 'Unknown'

            if (inch) {
                if (!groupedSizes[stitch]) groupedSizes[stitch] = []
                groupedSizes[stitch].push(`${inch}"`)
            }
        })

        const sizesText = Object.entries(groupedSizes)
            .map(([type, list]) => `${type} — ${list.join(', ')}`)
            .join(' / ')

        const charParts: string[] = []
        if (characters.includes('A-Z')) charParts.push('26 uppercase letters')
        if (characters.includes('a-z')) charParts.push('26 lowercase letters')
        if (characters.includes('0-9')) charParts.push('10 numbers')
        if (specials.length) charParts.push(`${specials.length} special characters`)

        const characterText = charParts.length ? charParts.join(', ') : 'Characters not specified'

        return `
    <p>${shortDescIntroduction}</p>
    
    <strong>Included files:</strong>
    <ul>
        <li><strong>BX Embroidery Font:</strong> Instantly create designs by typing letters with your keyboard in compatible software.</li>
        <li><strong>BX, PES, DST, EXP, JEF, VIP, VP3, HUS, SEW, SHV, XXX</strong> – Choose from a wide range of formats for your embroidery machine.</li>
        <li><strong>+ FREE</strong> step-by-step guides for installing and using your ${productName} embroidery font.</li>
    </ul>
    <p><strong>Sizes:</strong> ${sizesText}</p>
    <p><strong>Characters:</strong> ${characterText}</p>
    <p><a href="#tab-description">Learn more about the ${productName} embroidery font</a></p>
`.trim();
    }

    const renderLongTemplate = () => {

        const sizes = product.embroideryFontData?.sizes || []
        const characters = product.embroideryFontData?.characters || []
        const specials = product.embroideryFontData?.specialCharacters || []

        // Group sizes by stitch type
        const groupedSizes: Record<string, string[]> = {}
        sizes.forEach(size => {
            const inchMatch = size.match(/([\d.]+)"/)
            const labelMatch = size.match(/\(([^)]+)\)/)
            const inch = inchMatch?.[1]
            const stitch = labelMatch?.[1] || 'Unknown'

            if (inch) {
                if (!groupedSizes[stitch]) groupedSizes[stitch] = []
                groupedSizes[stitch].push(`${inch}"`)
            }
        })

        const sizesText = Object.entries(groupedSizes)
            .map(([type, list]) => `${type} — ${list.join(', ')}`)
            .join(' / ')

        const charParts: string[] = []
        if (characters.includes('A-Z')) charParts.push('26 uppercase letters')
        if (characters.includes('a-z')) charParts.push('26 lowercase letters')
        if (characters.includes('0-9')) charParts.push('10 numbers')
        if (specials.length) charParts.push(`${specials.length} special characters`)

        const characterText = charParts.length ? charParts.join(', ') : 'Characters not specified'

        return `
<h2 class="wp-block-heading">${productName} embroidery font – Enhance your projects with our machine-ready embroidery letters</h2>
${longDescriptionIntro}
<h3>What is included?</h3>
<ul>
  <li><strong>Formats:</strong> BX, PES, DST, EXP, JEF, VIP, VP3, HUS, SEW, SHV, XXX</li>
  <li><strong>Sizes:</strong> ${sizesText}</p>
  <li><strong>Characters:</strong> ${characterText}</p>
</ul>
<h3>Why choose our ${productName} Embroidery Letters?</h3>
<ul>
<li><strong>Ease of Use:</strong> The BX format allows for effortless typing directly on your keyboard, saving you time and effort in creating embroidery designs. Please read our <a href="https://www.font-station.com/how-to-use-a-bx-font/">tutorial</a> to learn how to use BX embroidery fonts with <a href="https://embrilliance.com/">Embrilliance</a>.</li>
<li><strong>Professional Quality:</strong> Each character has been expertly digitized to ensure clean, crisp stitching and excellent embroidery results.</li>
<li><strong>Versatility:</strong> Our font is suitable for a wide range of embroidery projects, from apparel and accessories to home decor and gifts.</li>
<li><strong>Customer Support:</strong> We're committed to providing excellent customer service. If you have any questions or need assistance, our team is here to help.</li>
</ul>
<h3>How to Use Our ${productName} Embroidery Alphabet?</h3>
<ul>
<li>Easily type words using your keyboard with the included <strong>BX embroidery font</strong>, made for <a href="https://embrilliance.com/express" target="_blank" rel="noopener">Embrilliance Express</a>.<br /><br /><strong>New to BX fonts?</strong>
<p>Follow our step-by-step guides on <a href="https://www.font-station.com/how-to-install-a-bx-font/" target="_blank" rel="noopener">how to install a BX embroidery font</a> and <a href="https://www.font-station.com/how-to-use-a-bx-font/" target="_blank" rel="noopener">how to use a BX embroidery font with Embrilliance</a>.</p>
</li>
<li>Prefer using separated letter files? No problem! We’ve created a helpful <a href="/?p=7701" target="_blank" rel="noopener">tutorial on how to use individual embroidery letter files</a> in any compatible software.</li>
</ul>
<h3>Commercial use limited to 1 sale:</h3>
<ul>
<li><strong>To help you make the most of this font if you buy it for profit</strong>, the included license allows you to make one sale of a product using this font.</li>
<li>If you make several sales using this font, please purchase our <a href="/?p=7768">commercial license</a>, which we sell at an affordable price.</li>
</ul>
<p><strong>We do our utmost to offer quality resources at affordable prices</strong>, with a view to helping young designers make a living from their passions.</p>
<h3>Forbidden uses:</h3>
<ul>
<li>Modifying and reselling the font as your own.</li>
<li>Distributing the font files or including them in products for free or paid download.</li>
<li>Distributing the embroidery alphabet as single letters or full sets.</li>
<li>Sharing or reselling the digital files in any format.</li>
</ul>
<h3>Things to know before purchasing:</h3>
<ul>
<li>This item is digital and will be available for download after payment.</li>
<li>The file will be delivered in a zipped/compressed format.</li>
<li>No refunds, returns, or exchanges are possible on digital files.</li>
</ul>
<h3>Ideal for:</h3>
<ul>
<li>Embroiderers, Crafters, Creators, Handmade Enthusiasts and every one who wants to discover the wonderful world of embroidery!</li>
</ul>
<h3>Compatible with many embroidery machines and embroidery softwares:</h3>
<ul>
<li>Compatible Brands: Brother, Janome, Singer, Pfaff, Husqvarna Viking, Bernina, Babylock and many more.</li>
<li>Compatible Softwares: Embrilliance, Embrilliance Essentials, Wilcom Hatch, Bernina Embroidery Software, Janome Digitizer, PE-Design, and more.</li>
</ul>
<h3>Any question?</h3>
<p>We're here to help! Don't hesitate to <a href="/?page_id=6711">contact us</a>.</p>
`.trim()
    }

    return (
        <div className="space-y-12">

            {/* === SHORT DESCRIPTION SECTION === */}
            <div>
                <h3 className="text-lg font-bold mb-4">Short Description</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Short Description Prompt */}
                    <div>
                        <label className="block font-semibold mb-1">Short Description Intro Prompt</label>
                        <Input textArea rows={10} value={shortPrompt} readOnly />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(shortPrompt, 'Short Prompt')}
                        >
                            Copy Prompt
                        </Button>
                    </div>

                    {/* Short Description Input */}
                    <div>
                        <label className="block font-semibold mb-1">Short Product Description Intro</label>
                        <Input textArea rows={10} value={shortDescIntroduction} onChange={(e) => setShortDescriptionIntro(e.target.value)} />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(shortDescIntroduction, 'Short Description')}
                        >
                            Copy Short Description
                        </Button>
                    </div>
                </div>
            </div>

            {/* === LONG DESCRIPTION SECTION === */}
            <div>
                <h3 className="text-lg font-bold mb-4">Long Description</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Long Prompt */}
                    <div>
                        <label className="block font-semibold mb-1">Long Description Intro Prompt</label>
                        <Input textArea rows={10} value={longPrompt} readOnly />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(longPrompt, 'Long Prompt')}
                        >
                            Copy Prompt
                        </Button>
                    </div>

                    {/* Long Description Input */}
                    <div>
                        <label className="block font-semibold mb-1">Long Product Description Intro</label>
                        <Input textArea rows={10} value={longDescriptionIntro} onChange={(e) => setLongDescriptionIntro(e.target.value)} />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(longDescriptionIntro, 'Long Description')}
                        >
                            Copy Long Description
                        </Button>
                    </div>
                </div>
            </div>

            {/* === SNIPPET SECTION === */}
            <div>
                <h3 className="text-lg font-bold mb-4">Product Snippet</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Snippet Prompt */}
                    <div>
                        <label className="block font-semibold mb-1">Snippet Description Prompt</label>
                        <Input
                            textArea
                            rows={10}
                            value={snippetDescriptionPrompt}
                            onChange={(e) => setSnippetDescription(e.target.value)}
                        />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(snippetDescriptionPrompt, 'Snippet Description Prompt')}
                        >
                            Copy Prompt
                        </Button>
                    </div>

                    {/* Snippet Output */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block font-semibold">Snippet Output</label>
                            <span className={`text-sm ${snippetDescription.length > 160 ? 'text-red-500' : 'text-gray-500'}`}>
                                {snippetDescription.length} / 160 characters
                            </span>
                        </div>
                        <Input
                            textArea
                            value={snippetDescription}
                            rows={10}
                            onPaste={(e) => {
                                setSnippetDescription(snippetDescription)
                            }}
                            onChange={(e) => {
                                setSnippetDescription(e.target.value)
                            }}
                        />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(snippetDescription, 'Snippet Template')}
                        >
                            Copy Snippet Description
                        </Button>
                    </div>
                </div>
            </div>


            {/* === SHORT TEMPLATE === */}
            <div>
                <h3 className="text-lg font-bold mb-4">Short Description Template</h3>
                <Tabs defaultValue="raw">
                    <TabList>
                        <TabNav value="raw">Raw HTML</TabNav>
                        <TabNav value="render">Preview</TabNav>
                    </TabList>
                    <TabContent value="raw">
                        <Input textArea value={renderShortTemplate()} rows={14} />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(renderShortTemplate(), 'Short Template')}
                        >
                            Copy Short Template
                        </Button>
                    </TabContent>
                    <TabContent value="render">
                        <div
                            className="border p-4 bg-gray-50 rounded"
                            dangerouslySetInnerHTML={{ __html: renderShortTemplate() }}
                        />
                    </TabContent>
                </Tabs>
            </div>

            {/* === LONG TEMPLATE === */}
            <div>
                <h3 className="text-lg font-bold mb-4">Long Description Template</h3>
                <Tabs defaultValue="raw">
                    <TabList>
                        <TabNav value="raw">Raw HTML</TabNav>
                        <TabNav value="render">Preview</TabNav>
                    </TabList>
                    <TabContent value="raw">
                        <Input textArea readOnly value={renderLongTemplate()} rows={20} />
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<HiOutlineClipboardCopy />}
                            onClick={() => copy(renderLongTemplate(), 'Long Template')}
                        >
                            Copy Long Template
                        </Button>
                    </TabContent>
                    <TabContent value="render">
                        <div
                            className="border p-4 bg-gray-50 rounded"
                            dangerouslySetInnerHTML={{ __html: renderLongTemplate() }}
                        />
                    </TabContent>
                </Tabs>
            </div>

            {/* === SAVE BUTTON === */}
            <div className="flex justify-end">
                <Button variant="solid" onClick={handleSave}>
                    Save
                </Button>
            </div>
        </div>
    )

}

export default WebsiteListingGenerator
