import WordpressApiService from '@/services/WordpressService'
import axios from 'axios'
import { getDownloadURL, ref, listAll } from 'firebase/storage'
import { storage } from '@/firebase'

export const generateWordPressHtml = (
    category: string,
    mainKeyword: string,
    secondKeyword: string
) => {
    const cleanKeyword = mainKeyword.replace(/\s+/g, ' ').trim()
    const cleanTheme = secondKeyword.replace(/\s+/g, ' ').trim()
    const keywordSlug = cleanKeyword.toLowerCase().replace(/\s+/g, '-')
    const fullSlug = `${keywordSlug}-font`

    const focusKeyword = `${cleanKeyword} font`

    const rankMath = {
        title: `${cleanKeyword} Font - Instant Download`,
        permalink: fullSlug,
        description: `Take a look at our ${cleanKeyword} font, inspired by the ${cleanTheme} font. This font is compatible with Cricut, Canva, Microsoft Word, Silhouette and more.`,
        focusKeyword,
    }

    switch (category) {
        case 'font':
            return {
                excerpt: `
<p>Our ${cleanKeyword} font, inspired by ${cleanTheme}, is ideal for your creations! This font is provided in multiple formats, ensuring compatibility with a wide range of software such as Cricut, Canva, Microsoft Word, Silhouette and more.</p>
<p><strong>Included files:</strong></p>
<ul>
<li><strong>OTF</strong> &amp; <strong>TTF</strong> installable formats: install the font on your device and type directly in your favorite software</li>
<li><strong>PNG</strong>, <strong>SVG</strong>, <strong>PDF</strong>, <strong>AI</strong> and <strong>EPS</strong> image formats: infinite resolution, you can enlarge and reduce images at will and create words as you like</li>
<li>All font characters are also available as individual files, making them very easy to use.</li>
<li><a href="#common-questions">FontLite®</a> user license</li>
<li><b>+ FREE</b> Step-By-Step guides for installing and using our ${cleanKeyword} font</li>
</ul>
<p><a href="#tab-description">Learn more about ${cleanKeyword} font</a></p>
                `.trim(),
                content: `
<h2 class="wp-block-heading">Our ${cleanKeyword} typeface, inspired from ${cleanTheme} font</h2>
<p>Unlock Your Creativity with our ${cleanKeyword} Font: A versatile font that you can use in any of your projects!</p>
<p>When you choose FontMaze, you are guaranteed a high-quality font and a premium customer support. If you ever have a question, we will be there to help!</p>
<p>Grab your computer, tablet or other device and start creating right now with our ${cleanTheme} font letters! Our ${cleanKeyword} typography is inspired from ${cleanTheme}, making it ideal for various digital creations (logo, word...), sublimation, cake toppers, stickers, event decorations, and more.</p>
<p>[wpcode id="833"]</p>
                `.trim(),
                slug: fullSlug,
                rankMath,
            }

        case 'football_font':
            return {
                excerpt: `
<p>The ${cleanKeyword} football font, themed around ${cleanTheme}, brings sports energy to your projects. Compatible with design software like Cricut and Silhouette.</p>
                `.trim(),
                content: `
<h2>Football Font</h2>
<p>Create bold, athletic visuals with ${cleanKeyword}, inspired by ${cleanTheme}. Ideal for sportswear, banners, and fan gear.</p>
                `.trim()
            }

        default:
            return {
                excerpt: `<p>${cleanKeyword} product inspired by ${cleanTheme}</p>`,
                content: `<h2>${cleanKeyword}</h2><p>Creative asset inspired by ${cleanTheme}</p>`
            }
    }
}

// Fetch a WordPress post by its ID
const WOO_BASE_URL = import.meta.env.VITE_WOO_BASE_URL
const WOO_CONSUMER_KEY = import.meta.env.VITE_WOO_CONSUMER_KEY
const WOO_CONSUMER_SECRET = import.meta.env.VITE_WOO_CONSUMER_SECRET

export const fetchWooProductById = async (id: number) => {
    try {

        const response = await WordpressApiService.fetchData<any[]>({
            url: `/products/${id}`,
            method: "get",
            params: {
                consumer_key: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
                consumer_secret: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
            },
        })
        console.log('[Loaded WP Template]', response.data)
        return response.data
    } catch (error) {
        console.error('[Woo Fetch Error]', error)
        return null
    }
}

// Uploads an image from Firebase Storage to WordPress Media Library
export async function uploadImageToWordPress(firebasePath: string) {
    console.log('[Upload] Starting upload for:', firebasePath)

    const storageRef = ref(storage, firebasePath)
    const downloadUrl = await getDownloadURL(storageRef)
    console.log('[Upload] Download URL:', downloadUrl)

    const blob = await (await fetch(downloadUrl)).blob()
    console.log('[Upload] Blob fetched, size:', blob.size)

    const fileName = firebasePath.split('/').pop() || 'image.webp'
    console.log('[Upload] File name resolved:', fileName)

    const formData = new FormData()
    formData.append('file', blob, fileName)
    console.log('[Upload] FormData prepared')

    const response = await WordpressApiService.fetchData<{ id: number; source_url: string; alt_text: string }>({
        url: 'https://fontmaze.com/wp-json/wp/v2/media',
        method: 'post',
        headers: {
            'Content-Disposition': `attachment; filename="${fileName}"`,
        },
        data: formData,
    })

    console.log('[Upload] Upload successful:', response.data)

    return {
        id: response.data.id,
        src: response.data.source_url,
        name: fileName,
        alt: '', // optionally use alt based on product name/category
    }
}

// Lists all .webp images under the square thumbnails path for a product
export const listWebpSquareThumbnails = async (sku: string): Promise<string[]> => {
    console.log('[List Images] Listing webp thumbnails for SKU:', sku)

    const squareRef = ref(storage, `products/${sku}/files/thumbnails/square`)
    const result = await listAll(squareRef)

    const webpPaths = result.items
        .filter(item => item.name.endsWith('.webp'))
        .map(item => item.fullPath)

    console.log('[List Images] Found webp files:', webpPaths)

    return webpPaths
}
