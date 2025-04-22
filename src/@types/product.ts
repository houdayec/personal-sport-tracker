export class Product {
    sku!: string
    name!: string
    category!: string              // Category (e.g. 'football_font')
    etsyId?: string | null
    wordpressId?: number | null
    publishedOnEtsy!: boolean
    publishedOnWebsite!: boolean
    wordpressReviewUpdatedAt?: number | null
    status!: 'draft' | 'published' | 'archived' | 'removed' | 'undefined'
    etsy!: {
        tags: string[]                // Keywords for filtering
        materials?: string[]          // Optional materials used
        images: string[]              // List of image URLs
        link?: string             // Link to Etsy listing
        title: string                  // Full Etsy listing title
        description: string            // Etsy description
        price: number                  // Etsy price
        quantity: number              // Available quantity on Etsy
        currency: string
    }
    wordpress?: {
        id: number
        link?: string
        permalink?: string
        name?: string
        slug?: string
        price?: number
        images?: string[]
        status?: string
        categories?: string[]
        tags?: string[]
        description?: string
        shortDescription?: string
        averageRating?: number
        ratingCount?: number
        downloadable?: boolean
        downloads?: {
            id: number
            name: string
            file: string
        }[]
        downloadLimit?: number
        downloadExpiry?: number
        lastSyncedAt?: number
    }
    computedData?: {
        numberOfSales?: number | 0
        revenue?: number | 0
    }
    embroideryFontData?: {
        sizes: string[]
        characters?: string[]
        specialCharacters?: string[]
    }

    fontData?: {
        publishedOnTpt?: boolean
    }

    thumbnailsMetadata?: ThumbnailsMetadata
    etsyMetadata?: EtsyMetadata
    websiteMetadata?: WebsiteMetadata

    toPlainObject(): Record<string, any> {
        const { computedData, ...rest } = this
        return JSON.parse(JSON.stringify(this))
    }

    cleanForDatabase(): Record<string, any> {
        const {
            computedData, // runtime-only
            ...rest
        } = this

        return JSON.parse(JSON.stringify(rest)) // ensures plain object
    }

    constructor(data: Partial<Product>) {
        Object.assign(this, {
            sku: '',
            name: '',
            category: '',
            etsyId: null,
            wordpressId: null,
            publishedOnEtsy: false,
            publishedOnWebsite: false,
            wordpressReviewUpdatedAt: null,
            status: 'draft',
            etsy: {
                tags: [],
                materials: [],
                images: [],
                link: '',
                title: '',
                description: '',
                price: 0,
                quantity: 0,
                currency: 'USD',
            },
            computedData: {
                numberOfSales: 0,
                revenue: 0
            },
            ...data,
        })
    }

    static fromFirestore(id: string, data: any): Product {
        const newProduct = new Product({
            sku: id,
            ...data,
        })

        newProduct.sku = data.sku || ''
        newProduct.name = data.name || ''
        newProduct.category = data.category || ''
        newProduct.etsyId = data.etsyId || null
        newProduct.wordpressId = data.wordpressId ?? null
        newProduct.publishedOnEtsy = data.publishedOnEtsy ?? false
        newProduct.publishedOnWebsite = data.publishedOnWebsite ?? false
        newProduct.wordpressReviewUpdatedAt = data.wordpressReviewUpdatedAt ?? null
        newProduct.status = data.status || 'draft'

        newProduct.etsy = {
            tags: Array.isArray(data.etsy?.tags) ? data.etsy.tags : [],
            materials: Array.isArray(data.etsy?.materials) ? data.etsy.materials : [],
            images: Array.isArray(data.etsy?.images) ? data.etsy.images : [],
            link: data.etsy?.etsyLink || (data.etsyId ? `https://www.etsy.com/listing/${data.etsyId}` : ''),
            title: data.etsy?.title || '',
            description: data.etsy?.description || '',
            price: data.etsy?.price || 0,
            quantity: data.etsy?.quantity || 0,
            currency: data.etsy?.currency || 'USD',
        }

        if (data.category === 'football_font') {
            newProduct.embroideryFontData = {
                sizes: Array.isArray(data.embroideryFontData?.sizes) ? data.embroideryFontData.sizes : [],
                characters: Array.isArray(data.embroideryFontData?.characters) ? data.embroideryFontData.characters : [],
                specialCharacters: Array.isArray(data.embroideryFontData?.specialCharacters)
                    ? data.embroideryFontData.specialCharacters
                    : [],
            }
        }

        if (data.category === 'font') {
            newProduct.fontData = {
                publishedOnTpt: data.fontData?.publishedOnTpt ?? data.publishedOnTpt,
            }
        }
        return newProduct
    }

    static fromEtsyCSV(csvRow: Record<string, string>): Product {
        const {
            SKU,
            TITLE,
            DESCRIPTION,
            PRICE,
            CURRENCY_CODE,
            QUANTITY,
            TAGS,
            MATERIALS,
            IMAGE1, IMAGE2, IMAGE3, IMAGE4, IMAGE5, IMAGE6, IMAGE7, IMAGE8, IMAGE9, IMAGE10,
        } = csvRow

        const images = [
            IMAGE1, IMAGE2, IMAGE3, IMAGE4, IMAGE5,
            IMAGE6, IMAGE7, IMAGE8, IMAGE9, IMAGE10,
        ].filter(Boolean)

        const productCategory = (() => {
            if (SKU.startsWith('FTB')) return 'font_bundle'
            if (SKU.startsWith('EFTB')) return 'football_font_bundle'
            if (SKU.startsWith('EFT')) return 'football_font'
            if (SKU.startsWith('FT')) return 'font'
            if (SKU.startsWith('VF')) return 'vector_font'
            if (SKU.startsWith('LC')) return 'license'
            return 'undefined'
        })()

        return new Product({
            sku: SKU,
            name: TITLE,
            category: productCategory,
            etsyId: null,
            publishedOnEtsy: true,
            publishedOnWebsite: false,
            status: 'published',
            etsy: {
                title: TITLE,
                description: DESCRIPTION,
                price: parseFloat(PRICE) || 0,
                quantity: parseInt(QUANTITY) || 0,
                currency: CURRENCY_CODE || 'USD',
                tags: TAGS?.split(',').map((s) => s.trim()) || [],
                materials: MATERIALS?.split(',').map((s) => s.trim()) || [],
                images,
                link: '',
            },
        })
    }


    static createEmpty(): Product {
        return new Product({
            sku: '',
            name: '',
            category: '',
            etsyId: null,
            wordpressId: null,
            publishedOnEtsy: false,
            publishedOnWebsite: false,
            wordpressReviewUpdatedAt: null,
            status: 'draft',
            etsy: {
                tags: [],
                materials: [],
                images: [],
                link: '',
                title: '',
                description: '',
                price: 0,
                quantity: 0,
                currency: 'USD',
            },
            computedData: {
                numberOfSales: 0,
                revenue: 0,
            },
            fontData: {
                publishedOnTpt: false,
            },
            embroideryFontData: {
                sizes: [],
                characters: [],
                specialCharacters: [],
            },
        })
    }

    getCategoryName(): string {
        switch (this.category) {
            case 'font':
                return 'Font'
            case 'football_font':
                return 'football Font'
            case 'font_bundle':
                return 'Font Bundle'
            case 'vector_font':
                return 'Image Font'
            case 'license':
                return "License"
            default:
                return 'Autre'
        }
    }

    getImageThumbnail(): string {
        return this.etsy.images[0]?.replace('fullxfull', '160x160') || ''
    }

    getNameWithCategory(): string {
        switch (this.category) {
            case 'font':
                return `${this.name} Font`
            case 'football_font':
                return `${this.name} Football Font`
            case 'font_bundle':
                return `${this.name} Font Bundle`
            case 'football_font_bundle':
                return `${this.name} Football Font Bundle`
            case 'vector_font':
                return `${this.name} Image Font`
            case 'license':
                return `${this.name} License`
            default:
                return this.name
        }
    }
}

export const PRODUCT_CATEGORIES = [
    { label: 'Font', value: 'font' },
    { label: 'Football Font', value: 'football_font' },
    { label: 'Font Bundle', value: 'font_bundle' },
    { label: 'Football Font Bundle', value: 'football_font_bundle' },
    { label: 'Image Font', value: 'vector_font' },
    { label: 'License', value: 'license' },
]

export type ThumbnailMetadataBlock = {
    alt: string
    title: string
    caption: string
    description: string
}

export type ThumbnailsMetadata = {
    permalink: string
    main: ThumbnailMetadataBlock
    technical: ThumbnailMetadataBlock
    picture: ThumbnailMetadataBlock
    comments: string
    mainKeyword: string
    secondKeyword: string
}

export type EtsyMetadata = {
    title: string
    description: string
    tags: string[]
    mainKeyword: string
    secondKeyword: string
    relatedKeywords: string[]
    gptIntro: string,
    sizesDescription: string,
    isGenerated: boolean,
}

export type WebsiteMetadata = {
    mainKeyword: string
    secondKeyword: string
    shortDescIntro: string
    longDescIntro: string
    shortDescription: string
    longDescription: string
    snippetDescription: string
}
