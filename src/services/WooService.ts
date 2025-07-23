import WooCommerceApiService from '@/services/WooCommerceService'
import axios from 'axios'
import { getDownloadURL, ref, listAll } from 'firebase/storage'
import { storage } from '@/firebase'
import WordpressApiService from './WordpressService'

const API_URL = import.meta.env.VITE_WOOCOMMERCE_BASE_URL
const AUTH = {
    username: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
    password: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
}

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