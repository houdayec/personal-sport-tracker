export class Product {
    sku!: string
    name!: string
    category!: string              // Category (e.g. 'football_font')
    wordpressId?: number | null
    publishedOnWebsite!: boolean
    wordpressReviewUpdatedAt?: number | null
    status!: 'draft' | 'published' | 'archived' | 'removed' | 'undefined'
    mainKeyword!: string
    secondKeyword!: string
    price!: number
    fontData?: {
        publishedOnTpt?: boolean
        generated?: {
            ttfGenerated: boolean
            fontFamily: string
            fullName: string
            version: string
        }
    }

    wordpress?: WordPressData
    thumbnailsMetadata?: ThumbnailsMetadata
    websiteMetadata?: WebsiteMetadata

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
        newProduct.wordpressId = data.wordpressId ?? null
        newProduct.publishedOnWebsite = data.publishedOnWebsite ?? false
        newProduct.wordpressReviewUpdatedAt = data.wordpressReviewUpdatedAt ?? null
        newProduct.status = data.status || 'draft'

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
            wordpressId: null,
            publishedOnWebsite: false,
            wordpressReviewUpdatedAt: null,
            status: 'draft',
            fontData: {
                publishedOnTpt: false,
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
        return "";//this.etsy.images[0]?.replace('fullxfull', '160x160') || ''
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
    shadowColor?: string
    shadowBlur?: number
    shadowOffsetX?: number
    shadowOffsetY?: number
    shadowOpacity?: number

    sentence_charColor?: string
    sentence_showTextAreaBox?: boolean

    characters_preview_charColor?: string
    characters_preview_showTextAreaBox?: boolean
    characters_preview_showUppercase?: boolean
    characters_preview_showLowercase?: boolean
    characters_preview_showNumbers?: boolean
    characters_preview_showSpecials?: boolean

    example_laptop_charColor?: string
    example_laptop_showTextAreaBox?: boolean
    example_laptop_showUppercase?: boolean
    example_laptop_showLowercase?: boolean
    example_laptop_showNumbers?: boolean
    example_laptop_showSpecials?: boolean

    example_tablet_charColor?: string
    example_tablet_showTextAreaBox?: boolean
    example_tablet_showUppercase?: boolean
    example_tablet_showLowercase?: boolean
    example_tablet_showNumbers?: boolean
    example_tablet_showSpecials?: boolean
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

export type WordPressData = {
    id?: number
    slug?: string
    title?: string
    shortDescription?: string
    longDescription?: string
    snippetDescription?: string
    categories?: string[]
    tags?: string[]
    images?: string[]
    status?: 'draft' | 'pending' | 'publish'
    lastSyncedAt?: number
    excerpt?: string
    content?: string
    rankMath?: {
        title?: string
        permalink?: string
        slug?: string
        description?: string
        focusKeyword?: string
    }
}