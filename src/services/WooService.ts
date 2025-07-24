import WooCommerceApiService from '@/services/WooCommerceService'
import axios from 'axios'
import { getDownloadURL, ref, listAll } from 'firebase/storage'
import { storage } from '@/firebase'
import WordpressApiService from './WordpressService'
import { Product } from '@/@types/product'
import { slugify } from '@/utils/thumbnailUtils'

const API_URL = import.meta.env.VITE_WOOCOMMERCE_BASE_URL
const AUTH = {
    username: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
    password: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
}

export const generateWordPressHtml = (
    product: Product,
    category: string,
    mainKeyword: string,
    secondKeyword: string
) => {
    const cleanMainKeyword = mainKeyword.replace(/\s+/g, ' ').trim()
    const cleanSecondKeyword = secondKeyword.replace(/\s+/g, ' ').trim()
    const keywordSlug = slugify(product.name)
    const fullSlug = `${keywordSlug}-font`

    const focusKeyword = `${cleanMainKeyword} font`

    const rankMath = {
        title: `${cleanMainKeyword} Font - Instant Download`,
        permalink: fullSlug,
        description: `Take a look at our ${cleanMainKeyword} font, inspired by the ${cleanSecondKeyword} font. This font is compatible with Cricut, Canva, Microsoft Word, Silhouette and more.`,
        focusKeyword,
    }

    switch (category) {
        case 'font':
            return {
                excerpt: `
<p>Our ${cleanMainKeyword} font, inspired by ${cleanSecondKeyword}, is ideal for your creations! This font is provided in multiple formats, ensuring compatibility with a wide range of software such as Cricut, Canva, Microsoft Word, Silhouette and more.</p>
<p><strong>Included files:</strong></p>
<ul>
<li><strong>OTF</strong> &amp; <strong>TTF</strong> installable formats: install the font on your device and type directly in your favorite software</li>
<li><strong>PNG</strong>, <strong>SVG</strong>, <strong>PDF</strong>, <strong>AI</strong> and <strong>EPS</strong> image formats: infinite resolution, you can enlarge and reduce images at will and create words as you like</li>
<li>All font characters are also available as individual files, making them very easy to use.</li>
<li><a href="#common-questions">FontLite®</a> user license</li>
<li><b>+ FREE</b> Step-By-Step guides for installing and using our ${cleanMainKeyword} font</li>
</ul>
<p><a href="#tab-description">Learn more about ${cleanMainKeyword} font</a></p>
                `.trim(),
                content: `
<h2 class="wp-block-heading">Our ${cleanMainKeyword} typeface, inspired from ${cleanSecondKeyword} font</h2>
<p>Make your next project unique our ${cleanMainKeyword} Font: A versatile font that you can use in any of your projects!</p>
<p>When you choose FontMaze, you are guaranteed a high-quality font and a premium customer support. If you ever have a question, we will be there to help!</p>
<p>Grab your computer, tablet or other device and start creating right now with our ${cleanSecondKeyword} letters! Our ${cleanMainKeyword} typography is inspired from ${cleanSecondKeyword}, making it ideal for various digital creations (logo, slideshows, social networks posts, etc.), sublimation, cake toppers, stickers, event decorations, and more.</p>
<hr>
<h2 class="wp-block-heading">More information</h2>
<ul>
    <li>FontMaze <a href="https://www.fontmaze.com/fonts">fonts</a> are ideal for printers, designers, creators, handmade items, DIY projects and special events such as birthdays, weddings, gifts...</li>
    <li>Our lettering is compatible with mugs, wall art, prints, newspapers, blankets, hoodies, t-shirts, pillows, stickers, wall decor, clothing, cake decorations, cups, birthday invitations and much more!</li>
    <li>Our alphabet works with <a href="https://design.cricut.com/">Cricut Design Space</a>, <a href="https://www.silhouetteamerica.com/software/ss/download">Silhouette Studio</a>, <a href="https://www.adobe.com/products/illustrator/free-trial-download.html">Adobe Illustrator</a>, <a href="https://www.canva.com/">Canva</a>, <a href="https://www.adobe.com/products/photoshop/free-trial-download.html">Adobe Photoshop</a> and any other design software.</li>
</ul>`.trim(),
                slug: fullSlug,
                rankMath,
            }

        case 'football_font':
            return {
                excerpt: `
<p>The ${cleanMainKeyword} football font, themed around ${cleanSecondKeyword}, brings sports energy to your projects. Compatible with design software like Cricut and Silhouette.</p>
                `.trim(),
                content: `
<h2>Football Font</h2>
<p>Create bold, athletic visuals with ${cleanMainKeyword}, inspired by ${cleanSecondKeyword}. Ideal for sportswear, banners, and fan gear.</p>
                `.trim()
            }

        default:
            return {
                excerpt: `<p>${cleanMainKeyword} product inspired by ${cleanSecondKeyword}</p>`,
                content: `<h2>${cleanMainKeyword}</h2><p>Creative asset inspired by ${cleanSecondKeyword}</p>`
            }
    }
}

export const fetchWooProductById = async (id: number) => {

    try {
        //const proxyUrl = `https://dashboard-api.fontmaze.workers.dev?url=${encodeURIComponent(`https://fontmaze.com/wp-json/wc/v3/products/${id}`)}`

        const response = await WooCommerceApiService.fetchData<any[]>({
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

// Base64 encode the credentials once
const encodedCredentials = btoa(`${import.meta.env.VITE_WP_USERNAME}:${import.meta.env.VITE_WP_APP_PASSWORD}`);

export async function uploadImageToWordPress(
    firebasePath: string,
    meta: { alt: string; title: string; caption: string; description: string },
) {
    console.log('[Upload v2] Starting upload for:', firebasePath);

    // 1. fetch the blob from Firebase
    const storageRef = ref(storage, firebasePath);
    const downloadUrl = await getDownloadURL(storageRef);
    const blob = await (await fetch(downloadUrl)).blob();

    // 2. build FormData
    const fileName = firebasePath.split('/').pop() || 'upload';
    const formData = new FormData();
    formData.append('file', blob, fileName);

    // add your metadata fields here:
    formData.append('alt_text', meta.alt)
    formData.append('title', meta.title)
    formData.append('caption', meta.caption)
    formData.append('description', meta.description)

    console.log('[Upload v2] FormData prepared:', meta);

    // 3. POST to WP media
    try {
        const { data } = await axios.post<{ // Assuming WordpressApiService.fetchData wraps Axios,
            // or use axios directly if suitable
            id: number
            source_url: string
            alt_text: string
        }>(
            'https://fontmaze.com/wp-json/wp/v2/media',
            formData,
            {
                headers: {
                    //'Content-Disposition': `attachment; filename="${fileName}"`,
                    'Authorization': `Basic ${encodedCredentials}`, // <-- THIS IS THE KEY LINE
                    'Content-Type': 'multipart/form-data', // Axios usually sets this correctly for FormData, but good to be explicit
                },
                // You might need to add withCredentials: true if you're dealing with cookies/sessions
                // but for Application Passwords, it's usually not necessary.
                // withCredentials: true,
            }
        );

        console.log('[Upload] Success:', data);
        return {
            id: data.id,
            src: data.source_url,
            name: fileName,
            alt: '',
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('[Upload Error] Axios Error:', error.response?.data || error.message);
            console.error('Status:', error.response?.status);
        } else {
            console.error('[Upload Error] General Error:', error);
        }
        throw error; // Re-throw to propagate the error
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

/*
 * Publishes a new WooCommerce product (or updates existing),
 * attaching uploaded images and the ZIP file.
 */
/**
 * Publishes or updates a WooCommerce product based on SKU.
 * Attaches thumbnail image IDs and ZIP media ID.
 */
export async function publishWooProduct(product: any, imageIds: number[], zipMedia: any): Promise<any> {
    console.log('[publishWooProduct] ▶️ Start')
    console.log('categoryIds', product.categoryIds)
    const payload = {
        ...product,
        images: imageIds.map(id => ({ id })),
        featured_media: imageIds[0],
        meta_data: [
            ...(product.meta_data || []),
            { key: 'zip_media_id', value: zipMedia.id },
        ],
        downloadable: true,
        virtual: true,
        downloads: [
            {
                name: `${product.sku} ${product.name}`,
                file: zipMedia.source_url,
            },
        ],
    }

    console.log(`[publishWooProduct] 🔍 Checking for existing SKU "${product.sku}"`)
    const existing = await axios.get(`${API_URL}/products`, {
        params: {
            sku: product.sku,
            per_page: 1,
            consumer_key: AUTH.username,
            consumer_secret: AUTH.password,
        },
    })

    const match = Array.isArray(existing.data) && existing.data.length > 0 && existing.data[0].sku === product.sku

    if (match) {
        const id = existing.data[0].id
        console.log(`[publishWooProduct] ✏️ Updating existing product ID ${id}`)

        const res = await axios.put(`${API_URL}/products/${id}`, payload, {
            auth: AUTH,
        })
        console.log('[publishWooProduct] ✅ Updated', res.data.id)
        return res.data
    } else {
        console.log('[publishWooProduct] 🆕 Creating new product')

        const res = await axios.post(`${API_URL}/products`, payload, {
            auth: AUTH,
        })
        console.log('[publishWooProduct] ✅ Created', res.data.id)
        return res.data
    }
}

// Fetch product categories from WooCommerce
export async function fetchWordpressProductCategories(): Promise<{ id: number; name: string }[]> {

    const response = await axios.get(`${API_URL}/products/categories`, {
        auth: AUTH,
        params: {
            per_page: 100,
        },
    })

    return response.data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
    }))
}

export const deleteWooProductBySku = async (sku: string): Promise<boolean> => {
    try {
        // Fetch product by SKU to get its ID
        const { data } = await axios.get(`${API_URL}/products`, {
            auth: AUTH,
            params: { sku },
        })

        const product = data?.[0]
        if (!product?.id) return false

        // Delete the product using its ID
        await axios.delete(`${API_URL}/products/${product.id}`, {
            auth: AUTH,
            params: { force: true },
        })

        return true
    } catch (err) {
        console.error('[deleteWooProductBySku] ❌', err)
        return false
    }
}