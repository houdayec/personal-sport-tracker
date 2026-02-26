import type { ReviewDraft, ReviewSeed } from './review'

export class Product {
    sku!: string
    name!: string
    category!: string              // Category (e.g. 'football_font')
    etsyId?: number | null
    publishedOnWebsite!: boolean
    wordpressReviewUpdatedAt?: number | null
    status!: 'draft' | 'published' | 'archived' | 'removed' | 'undefined'
    mainKeyword!: string
    secondKeyword!: string
    fullPrice!: number
    salePrice!: number
    fontData?: {
        publishedOnTpt?: boolean
        generated?: {
            ttfGenerated: boolean
            uploaded: boolean
            fontFamily?: string
            fullName?: string
            version?: string
        }
    }
    computedData?: {
        numberOfSales: number
        revenue: number
    }

    thumbnails?: any
    wordpress?: WordPressData
    thumbnailsMetadata?: ThumbnailsMetadata
    websiteMetadata?: WebsiteMetadata
    reviews?: ReviewDraft[]
    reviewSeed?: ReviewSeed

    toPlainObject(): Record<string, any> {
        const { ...rest } = this
        return JSON.parse(JSON.stringify(this))
    }

    cleanForDatabase(): Record<string, any> {
        const {
            ...rest
        } = this

        return JSON.parse(JSON.stringify(rest)) // ensures plain object
    }

    constructor(data: Partial<Product>) {
        Object.assign(this, {
            sku: '',
            name: '',
            category: '',
            wordpressId: null,
            publishedOnEtsy: false,
            publishedOnWebsite: false,
            wordpressReviewUpdatedAt: null,
            status: 'draft',
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
        newProduct.wordpress = { ...newProduct.wordpress, id: data.wordpress?.id ?? null }
        newProduct.publishedOnWebsite = data.publishedOnWebsite ?? false
        newProduct.wordpressReviewUpdatedAt = data.wordpressReviewUpdatedAt ?? null
        newProduct.status = data.status || 'draft'
        newProduct.reviews = data.reviews ?? []
        newProduct.reviewSeed = data.reviewSeed ?? undefined

        if (data.category === 'football_font') {

        }

        if (data.category === 'font') {
            newProduct.fontData = {
                publishedOnTpt: data.fontData?.publishedOnTpt ?? data.publishedOnTpt,
            }
        }

        if (data.fontData?.generated) {
            newProduct.fontData = {
                ...newProduct.fontData,
                generated: data.fontData.generated,
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
            publishedOnWebsite: false,
            status: 'published',
        })
    }


    static createEmpty(): Product {
        return new Product({
            sku: '',
            name: '',
            category: '',
            publishedOnWebsite: false,
            wordpressReviewUpdatedAt: null,
            status: 'draft',
            fontData: {
                publishedOnTpt: false,
                generated: {
                    ttfGenerated: false,
                    fontFamily: undefined,
                    fullName: undefined,
                    version: "1.000",
                },
            },
            reviews: [],
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
        return this.thumbnails?.main?.firebaseUrl || ""
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

export const categoryOptions = [
    { label: 'Font', value: 'font' },
    { label: 'Football Font', value: 'football_font' },
    { label: 'Font Bundle', value: 'font_bundle' },
    { label: 'Football Font Bundle', value: 'football_font_bundle' },
    { label: 'Image Font', value: 'vector_font' },
]

export const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
    { label: 'Undefined', value: 'undefined' },
]

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
export const REQUIRED_THUMBNAIL_SLUGS = ['main', 'characters-preview', 'included-files', 'sentence'] as const
export type ThumbnailSlug = typeof REQUIRED_THUMBNAIL_SLUGS[number]
export const DEFAULT_SLUG_ORDER = [
    'main',
    'sentence',
    'characters-preview',
    'included-files',
    'compatibility',
    'example-laptop',
    'example-tablet',
]
export type ThumbnailsMetadata = {
    permalink: string
    main: ThumbnailMetadataBlock
    technical: ThumbnailMetadataBlock
    picture: ThumbnailMetadataBlock
    comments: string
    mainKeyword: string
    secondKeyword: string
    slugs: { "main": string, "characters-preview": string, "included-files": string, "sentence": string }

    main_titleText?: string
    main_bgColor?: string
    main_patternType?: string
    main_patternColor?: string
    main_patternOpacity?: number
    main_titleColor?: string
    main_titleStrokeColor?: string
    main_titleStrokeWidth?: number
    main_charColor?: string
    main_titleScale?: number
    main_charScale?: number
    main_topOffset?: number
    main_showUppercase?: boolean
    main_showLowercase?: boolean
    main_showNumbers?: boolean
    main_showSpecials?: boolean
    main_charset?: string
    main_watermarkOpacity?: number
    main_watermarkColor?: string
    main_gradientEnabled?: boolean
    main_gradientColor1?: string
    main_gradientColor2?: string
    main_gradientType?: 'center' | 'diagonal'
    main_patternScale?: number
    main_patternDiagonal?: boolean
    main_patternIcon?: string
    main_charVerticalOffset?: number
    main_gradientSync?: boolean
    main_watermarkVersion?: string
    main_charLines?: number
    main_charLineHeight?: number

    shadowColor?: string
    shadowBlur?: number
    shadowOffsetX?: number
    shadowOffsetY?: number
    shadowOpacity?: number

    main_metaAlt?: string
    main_metaTitle?: string
    main_metaCaption?: string
    main_metaDescription?: string

    sentence_charColor?: string
    sentence_showTextAreaBox?: boolean
    sentence_case: 'title',
    sentence_yOffset?: number
    sentence2_enabled?: boolean
    sentence2_case?: 'title' | 'upper' | 'lower'
    sentence2_yOffset?: number

    characters_preview_charColor?: string
    characters_preview_showTextAreaBox?: boolean
    characters_preview_showUppercase?: boolean
    characters_preview_showLowercase?: boolean
    characters_preview_showNumbers?: boolean
    characters_preview_showSpecials?: boolean
    characters_preview_yOffset?: number
    characters_preview_autoFontSize?: boolean
    characters_preview_manualFontSize?: number
    characters_preview_lineHeightRatio?: number

    included_files_charColor?: string

    example_laptop_charColor?: string
    example_laptop_showTextAreaBox?: boolean
    example_laptop_showUppercase?: boolean
    example_laptop_showLowercase?: boolean
    example_laptop_showNumbers?: boolean
    example_laptop_showSpecials?: boolean
    example_laptop_casing?: 'default' | 'lower' | 'upper' | 'title'

    example_tablet_charColor?: string
    example_tablet_showTextAreaBox?: boolean
    example_tablet_showUppercase?: boolean
    example_tablet_showLowercase?: boolean
    example_tablet_showNumbers?: boolean
    example_tablet_showSpecials?: boolean
    example_tablet_xOffset?: number
    example_tablet_yOffset?: number
    example_tablet_autoFontSize?: boolean
    example_tablet_manualFontSize?: number
    example_tablet_letter?: string

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

export type WpMediaData = {
    id: number;
    name: string;
    source_url: string;
    alt_text: string;
    caption?: string;
    title?: string;
    description?: string;
}

export type WordPressData = {
    id?: number
    slug?: string
    title?: string
    isFeatured?: boolean
    shortDescription?: string
    longDescription?: string
    snippetDescription?: string
    categories?: string[]
    categoriesIds?: number[]
    tags?: string[]
    images?: string[]
    status?: 'draft' | 'pending' | 'publish'
    lastSyncedAt?: number
    excerpt?: string
    content?: string
    view_url?: string
    edit_url?: string
    trademarkName?: string
    rankMath?: {
        title?: string
        permalink?: string
        slug?: string
        description?: string
        focusKeyword?: string
    }
}

export const getPricingByCategory = (category: string) => {
    switch (category) {
        case 'font':
        case 'football_font':
        case 'vector_font':
            return { fullPrice: 4.99, salePrice: 2.49 }
        case 'font_bundle':
        case 'football_font_bundle':
            return { fullPrice: 9.99, salePrice: 4.99 }
        default:
            return { fullPrice: 0, salePrice: 0 }
    }
}
