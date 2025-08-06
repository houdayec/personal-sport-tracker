import { ThumbnailsMetadata } from "@/@types/product";
// src/data/IconPalette.ts
import {
    Star, Heart, Smile, Camera, Zap, Sun, Cloud, Diamond,
    ChevronRight, Bell, Music, Globe, Gift, Anchor, Shield,
} from 'lucide-react'
import { ComponentType, ReactElement, SVGProps } from "react";

// Draws a gradient on a canvas context
export function drawGradient(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    colors: string[],
    type: 'center' | 'diagonal'
) {
    let gradient: CanvasGradient;

    if (type === 'center') {
        gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width / 2
        );
    } else {
        gradient = ctx.createLinearGradient(0, height, width, 0);
    }

    const step = 1 / (colors.length - 1);
    colors.forEach((color, i) => {
        gradient.addColorStop(i * step, color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

export function hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function getCharacterLines(meta: ThumbnailsMetadata): string[] {
    const letterPairs = [
        'Aa Bb Cc Dd Ee Ff Gg',
        'Hh Ii Jj Kk Ll Mm Nn',
        'Oo Pp Qq Rr Ss Tt Uu',
        'Vv Ww Xx Yy Zz'
    ]
    const uppercaseLines = ['A B C D E F G H I J', 'K L M N O P Q R', 'S T U V W X Y Z']
    const lowercaseLines = uppercaseLines.map(l => l.toLowerCase())
    const numberLine = '0 1 2 3 4 5 6 7 8 9'
    const specialLine = '! @ # $ % ^ & * ( ) - _ = +'

    let lines: string[] = []
    if (meta.main_showUppercase && meta.main_showLowercase) lines = [...letterPairs]
    else if (meta.main_showUppercase) lines = [...uppercaseLines]
    else if (meta.main_showLowercase) lines = [...lowercaseLines]
    if (meta.main_showNumbers) lines.push(numberLine)
    if (meta.main_showSpecials) lines.push(specialLine)

    return lines.length > 0 ? lines : meta.main_charset?.split('\n').filter(Boolean) || [...letterPairs]
}

/**
 * Renders the thumbnail onto the provided canvas using metadata, pattern images, and watermark.
 * Returns a data URL of the generated PNG.
 */
export function renderThumbnail(
    canvas: HTMLCanvasElement,
    meta: ThumbnailsMetadata,
    patternImages: Record<string, HTMLImageElement>,
    watermarkImg: HTMLImageElement
): string {
    // Destructure metadata with defaults to eliminate any `undefined`
    const {
        main_bgColor = '#ffffff',
        main_gradientEnabled = false,
        main_gradientColor1 = '#ffffff',
        main_gradientColor2 = '#000000',
        main_gradientType = 'diagonal',
        main_patternType = 'none',
        main_patternColor = '#000000',
        main_patternOpacity = 0.2,
        main_watermarkOpacity = 0.02,
        main_topOffset = 150,
        main_titleText = 'Font Name',
        main_titleScale = 0.7,
        main_titleColor = '#000000',
        main_titleStrokeWidth = 0,
        main_titleStrokeColor = '#000000',
        main_charScale = 1.0,
        main_charColor = '#333333',
        shadowColor = '#000000',
        shadowOpacity = 0.3,
        shadowBlur = 0,
        shadowOffsetX = 0,
        shadowOffsetY = 0,
    } = meta

    const ctx = canvas.getContext('2d')!
    const S = canvas.width
    const P = 100

    // Clear & background
    ctx.clearRect(0, 0, S, S)
    ctx.fillStyle = main_bgColor
    ctx.fillRect(0, 0, S, S)

    // Gradient overlay
    if (main_gradientEnabled) {
        drawGradient(
            ctx,
            S,
            S,
            [main_gradientColor1, main_gradientColor2],
            main_gradientType
        )
    }

    // Pattern overlay
    if (main_patternType !== 'none' && patternImages[main_patternType]) {
        ctx.save()
        ctx.globalAlpha = main_patternOpacity
        const pat = ctx.createPattern(patternImages[main_patternType], 'repeat')!
        ctx.fillStyle = pat
        ctx.fillRect(0, 0, S, S)
        ctx.globalCompositeOperation = 'source-in'
        ctx.fillStyle = main_patternColor
        ctx.fillRect(0, 0, S, S)
        ctx.restore()
    }

    // Watermark
    ctx.save()
    ctx.globalAlpha = main_watermarkOpacity
    ctx.drawImage(watermarkImg, 0, 0, S, S)
    ctx.restore()

    // Title
    const titleArea = S * 0.25
    const yTitle = P + main_topOffset
    const tf = Math.floor(titleArea * main_titleScale)

    ctx.save()
    ctx.shadowColor = hexToRgba(shadowColor, shadowOpacity)
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = shadowOffsetX
    ctx.shadowOffsetY = shadowOffsetY

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = `${tf}px ProductFont, sans-serif`
    ctx.fillStyle = main_titleColor
    ctx.fillText(main_titleText, S / 2, yTitle)

    if (main_titleStrokeWidth) {
        ctx.lineWidth = main_titleStrokeWidth
        ctx.strokeStyle = main_titleStrokeColor
        ctx.strokeText(main_titleText, S / 2, yTitle)
    }
    ctx.restore()

    // Characters
    const lines = getCharacterLines(meta)
    const topChars = yTitle + tf + P
    const bottomHeight = S - topChars - P
    const count = lines.length
    const spacing = 80
    const baseF = Math.floor((bottomHeight - spacing * (count - 1)) / count)
    let cf = Math.floor(baseF * main_charScale)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = main_charColor
    ctx.font = `${cf}px ProductFont, sans-serif`

    // Shrink-to-fit if too wide
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width))
    if (maxW > S - 2 * P) {
        const sc = (S - 2 * P) / maxW
        cf = Math.floor(cf * sc)
        ctx.font = `${cf}px ProductFont, sans-serif`
    }

    const totalH = cf * count + spacing * (count - 1)
    const sy = topChars + (bottomHeight - totalH) / 2
    lines.forEach((l, i) => ctx.fillText(l, S / 2, sy + i * (cf + spacing)))

    // Return the final image
    return canvas.toDataURL('image/png')
}


/* ② tighter – only SVG icons (better for lucide-react / phosphor-react) */
export type IconEntry = {
    name: string
    Comp: ComponentType<SVGProps<SVGSVGElement>>
}
export const ICON_PALETTE: IconEntry[] = [
    { name: 'Star', Comp: Star },
    { name: 'Heart', Comp: Heart },
    { name: 'Smile', Comp: Smile },
    { name: 'Camera', Comp: Camera },
    { name: 'Zap', Comp: Zap },
    { name: 'Sun', Comp: Sun },
    { name: 'Cloud', Comp: Cloud },
    { name: 'Diamond', Comp: Diamond },
    { name: 'ChevronRight', Comp: ChevronRight },
    { name: 'Bell', Comp: Bell },
    { name: 'Music', Comp: Music },
    { name: 'Globe', Comp: Globe },
    { name: 'Gift', Comp: Gift },
    { name: 'Anchor', Comp: Anchor },
    { name: 'Shield', Comp: Shield },
]

export const slugify = (str: string) =>
    str.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w\-]+/g, '')
