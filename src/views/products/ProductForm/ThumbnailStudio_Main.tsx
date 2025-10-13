import { useEffect, useState, useRef, useCallback } from 'react'
import { Field, useFormikContext, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { storage } from '@/firebase'
import { ref, getDownloadURL } from 'firebase/storage'
import ThumbnailUploader from './ThumbnailUploader'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Product, ThumbnailsMetadata } from '@/@types/product'
import { drawGradient, getCharacterLines, hexToRgba, hexToRgbaString, ICON_PALETTE } from '@/utils/thumbnailUtils'
import { Button, Card, Upload } from '@/components/ui'
import IconPickerDialog from './IconPickerDialog'
import { renderToStaticMarkup } from 'react-dom/server'
import { Loader2 } from 'lucide-react'
import BackgroundSettings from './components/BackgroundSettings'
import TitleSettings from './components/TitleSettings'
import CharacterSettings from './components/CharacterSettings'
import WatermarkSettings from './components/WatermarkSettings'

const CANVAS_SIZE = 2000
const PADDING = 100

export const PATTERNS = [
    { name: 'none', label: 'None', src: '' },
    { name: 'custom', label: 'Upload SVG', src: '' },
    { name: 'library', label: 'Icon Library', src: '' },
]

export const GRADIENT_PRESETS = [
    { name: 'sky-blue', color1: '#89CFF0', color2: '#0080FF', type: 'diagonal' },
    { name: 'sunset', color1: '#FF7E5F', color2: '#FEB47B', type: 'diagonal' },
    { name: 'mint', color1: '#98FF98', color2: '#00C896', type: 'diagonal' },
    { name: 'lavender', color1: '#E6E6FA', color2: '#B57EDC', type: 'diagonal' },
    { name: 'midnight-blue', color1: '#2C3E50', color2: '#1A252F', type: 'diagonal' },
    { name: 'classic-black', color1: '#000000', color2: '#111111', type: 'diagonal' },
    { name: 'light-grey', color1: '#f0f0f0', color2: '#d9d9d9', type: 'diagonal' },
    { name: 'charcoal', color1: '#444444', color2: '#222222', type: 'diagonal' },
    { name: 'peachy', color1: '#FFDAB9', color2: '#FFB6C1', type: 'diagonal' },
    { name: 'lemonade', color1: '#FFF9C4', color2: '#FFF176', type: 'diagonal' },
]

// Function to lighten a hex color
const getLighterColor = (hex: string) => {
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)

    r = Math.min(255, r + 50)
    g = Math.min(255, g + 50)
    b = Math.min(255, b + 50)

    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }).join('')
}

// Nouveaux préréglages d'ombre ajoutés
const SHADOW_PRESETS = [
    { name: 'none', shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0 },
    { name: 'subtle', shadowColor: '#000000', shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 5, shadowOpacity: 0.5 },
    { name: 'soft-glow', shadowColor: '#FFFFFF', shadowBlur: 15, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0.5 },
    { name: 'deep-drop', shadowColor: '#000000', shadowBlur: 10, shadowOffsetX: 8, shadowOffsetY: 8, shadowOpacity: 0.5 },
    { name: 'long-right', shadowColor: '#000000', shadowBlur: 5, shadowOffsetX: 20, shadowOffsetY: 5, shadowOpacity: 0.4 },
    { name: 'long-left', shadowColor: '#000000', shadowBlur: 5, shadowOffsetX: -20, shadowOffsetY: 5, shadowOpacity: 0.4 },
]

const MENU_ITEMS = [
    { key: 'background', label: 'Background' },
    { key: 'title', label: 'Title' },
    { key: 'characters', label: 'Characters' },
    { key: 'watermark', label: 'Watermark' },
]

const ThumbnailPreviewStudio = ({ isFontReady, productFontFamily }: { isFontReady: boolean, productFontFamily: string }) => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [patternImages, setPatternImages] = useState<Record<string, HTMLImageElement>>({})
    const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null)
    const [iconDialogOpen, setIconDialogOpen] = useState(false)
    const [activeMenu, setActiveMenu] = useState('title')

    const meta = values.thumbnailsMetadata ?? {} as ThumbnailsMetadata
    const {
        main_titleText = 'Font Name', main_bgColor = '#ffffff',
        main_patternType = 'none', main_patternColor = '#000000', main_patternOpacity = 0.2,
        main_titleColor = '#000000', main_titleStrokeColor = '#000000', main_titleStrokeWidth = 0,
        main_charColor = '#333333', main_titleScale = 0.7, main_charScale = 1.0, main_topOffset = 150,
        main_showUppercase = true, main_showLowercase = false, main_showNumbers = true, main_showSpecials = false,
        main_watermarkOpacity = 0.02,
        main_watermarkColor = '#000000',
        main_charset = '',
        shadowColor = '#000000',
        shadowBlur = 0,
        shadowOffsetX = 0,
        shadowOffsetY = 0,
        shadowOpacity = 0.3,
        main_gradientEnabled = false,
        main_gradientColor1 = '#ffffff',
        main_gradientColor2 = '#000000',
        main_gradientType = 'diagonal',
        main_gradientSync = false,
        main_patternScale = 0.4,
        main_patternDiagonal = true,
        main_charVerticalOffset = 0,
        main_watermarkVersion = 'black',
        main_charLines = 3,
        main_charLineHeight = 80,
    } = meta

    useEffect(() => {
        const img = new Image()
        img.src = main_watermarkVersion === 'white'
            ? '/img/others/fontmaze-watermark-white.png'
            : '/img/others/fontmaze-watermark-black.png'
        img.onload = () => setWatermarkImg(img)
    }, [main_watermarkVersion])

    useEffect(() => {
        if (!values.thumbnailsMetadata?.main_watermarkColor) {
            setFieldValue('thumbnailsMetadata.main_watermarkColor', main_titleColor)
        }
    }, [main_titleColor])

    useEffect(() => {
        const iconName = meta.main_patternIcon
        if (!iconName) return
        const entry = ICON_PALETTE.find(i => i.name === iconName)
        if (!entry) return

        const svg = renderToStaticMarkup(<entry.Comp size={512} />)
        const url = `data:image/svg+xml;base64,${btoa(svg)}`
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = url
        img.onload = () => {
            setPatternImages(prev => ({ ...prev, library: img }))
        }
    }, [meta.main_patternIcon])

    useEffect(() => {
        PATTERNS.forEach(p => {
            if (!p.src) return;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = p.src;
            img.onload = () => {
                setPatternImages(prev => ({ ...prev, [p.name]: img }));
            };
            img.onerror = err => console.error('Pattern load failed', p.name, err);
        });
    }, []);

    // Sync gradient colors if sync is enabled
    useEffect(() => {
        if (main_gradientSync) {
            const lighterColor = getLighterColor(main_gradientColor1)
            setFieldValue('thumbnailsMetadata.main_gradientColor2', lighterColor)
        }
    }, [main_gradientColor1, main_gradientSync])


    const lines = getCharacterLines(meta)

    const draw = useCallback(() => {
        if (!isFontReady || !watermarkImg) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.fillStyle = main_bgColor
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        if (main_gradientEnabled) {
            drawGradient(
                ctx,
                CANVAS_SIZE,
                CANVAS_SIZE,
                [main_gradientColor1, main_gradientColor2],
                main_gradientType
            )
        }

        if (main_patternType !== 'none' && patternImages[main_patternType]) {
            const icon = patternImages[main_patternType]
            const rawEdge = Math.max(icon.width, icon.height)

            const iconSize = rawEdge * main_patternScale
            const tileSize = iconSize * 2

            const tile = document.createElement('canvas')
            tile.width = tileSize
            tile.height = tileSize
            const tctx = tile.getContext('2d')!

            tctx.drawImage(
                icon,
                (tileSize - iconSize) / 2,
                (tileSize - iconSize) / 2,
                iconSize,
                iconSize
            )

            tctx.globalCompositeOperation = 'source-atop'
            tctx.fillStyle = main_patternColor
            tctx.fillRect(0, 0, tileSize, tileSize)
            tctx.globalCompositeOperation = 'source-over'

            ctx.save()
            ctx.globalAlpha = main_patternOpacity
            if (main_patternDiagonal) {
                ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2)
                ctx.rotate(-Math.PI / 4)
                ctx.translate(-CANVAS_SIZE / 2, -CANVAS_SIZE / 2)
            }

            const pat = ctx.createPattern(tile, 'repeat')!
            ctx.fillStyle = pat

            if (main_patternDiagonal) {
                const diag = CANVAS_SIZE * Math.SQRT2
                const offset = (diag - CANVAS_SIZE) / 2
                ctx.fillRect(-offset, -offset, diag, diag)
            } else {
                ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
            }
            ctx.restore()
        }

        ctx.save()
        ctx.globalAlpha = main_watermarkOpacity

        // Create temp canvas
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = watermarkImg.width
        tempCanvas.height = watermarkImg.height
        const tempCtx = tempCanvas.getContext('2d')!

        // Draw watermark normally
        tempCtx.drawImage(watermarkImg, 0, 0)

        // Extract pixels
        const imageData = tempCtx.getImageData(0, 0, watermarkImg.width, watermarkImg.height)
        const data = imageData.data

        // Convert to solid tint color, preserving alpha
        const tint = hexToRgba(main_watermarkColor, 1)
        for (let i = 0; i < data.length; i += 4) {
            data[i] = tint.r       // R
            data[i + 1] = tint.g   // G
            data[i + 2] = tint.b   // B
            // data[i + 3] stays unchanged (alpha)
        }

        tempCtx.putImageData(imageData, 0, 0)

        // Draw the tinted image to final canvas
        ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

        ctx.restore()

        const titleArea = CANVAS_SIZE * 0.25
        //const yTitle = PADDING + main_topOffset
        const yTitle = main_topOffset
        const titleFont = Math.floor(titleArea * main_titleScale)

        ctx.save()
        ctx.shadowColor = hexToRgbaString(shadowColor, shadowOpacity)
        ctx.shadowBlur = shadowBlur
        ctx.shadowOffsetX = shadowOffsetX
        ctx.shadowOffsetY = shadowOffsetY

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.font = `${titleFont}px "${productFontFamily}", sans-serif`
        ctx.fillStyle = main_titleColor
        const titleLines = main_titleText.split('\n')
        const titleSpacing = 10
        const totalTitleHeight = titleLines.length * titleFont + (titleLines.length - 1) * titleSpacing

        titleLines.forEach((line, i) => {
            const y = yTitle + i * (titleFont + titleSpacing)
            ctx.fillText(line, CANVAS_SIZE / 2, y)
            if (main_titleStrokeWidth) {
                ctx.lineWidth = main_titleStrokeWidth
                ctx.strokeStyle = main_titleStrokeColor
                ctx.strokeText(line, CANVAS_SIZE / 2, y)
            }
        })
        ctx.restore()

        let charBlockTop = yTitle + totalTitleHeight + main_topOffset;
        const charAreaHeight = CANVAS_SIZE - PADDING - charBlockTop;
        const titleCharSpacing = 60
        charBlockTop = yTitle + totalTitleHeight + titleCharSpacing
        const count = lines.length
        const spacing = main_charLineHeight
        const baseFont = Math.floor((charAreaHeight - spacing * (count - 1)) / count)
        let charFont = Math.floor(baseFont * main_charScale)

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = main_charColor
        ctx.font = `${charFont}px "${productFontFamily}", sans-serif`

        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width))
        if (maxW > CANVAS_SIZE - 2 * PADDING) {
            const scale = (CANVAS_SIZE - 2 * PADDING) / maxW
            charFont = Math.floor(charFont * scale)
            ctx.font = `${charFont}px "${productFontFamily}", sans-serif`
        }

        const totalH = charFont * count + spacing * (count - 1)
        const startY = charBlockTop + (charAreaHeight - totalH) / 2 + main_charVerticalOffset;

        lines.forEach((line, i) => ctx.fillText(line, CANVAS_SIZE / 2, startY + i * (charFont + spacing)))

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [
        isFontReady,
        watermarkImg,
        main_bgColor,
        main_gradientEnabled,
        main_gradientColor1,
        main_gradientColor2,
        main_gradientType,
        main_patternType,
        main_patternColor,
        main_patternOpacity,
        main_watermarkOpacity,
        main_titleText,
        main_titleScale,
        main_topOffset,
        main_titleColor,
        main_titleStrokeColor,
        main_titleStrokeWidth,
        main_charColor,
        main_charScale,
        shadowColor,
        shadowOpacity,
        shadowBlur,
        shadowOffsetX,
        shadowOffsetY,
        lines,
        productFontFamily,
        main_charVerticalOffset,
        main_charLines,
    ])

    useEffect(() => {
        const id = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(id)
    }, [draw])

    useEffect(() => {
        if (!values.thumbnailsMetadata?.main_titleText) {
            const fallback = values.name || 'Font Name'
            setFieldValue('thumbnailsMetadata.main_titleText', fallback)
        }

        // Set initial character sets if not defined
        if (!values.thumbnailsMetadata?.main_showUppercase && !values.thumbnailsMetadata?.main_showLowercase && !values.thumbnailsMetadata?.main_showNumbers && !values.thumbnailsMetadata?.main_showSpecials) {
            setFieldValue('thumbnailsMetadata.main_showUppercase', true)
            setFieldValue('thumbnailsMetadata.main_showLowercase', true)
        }
    }, [])

    const handleCustomPatternUpload = (files: File[], fileList: File[]) => {
        const file = files[0]
        if (!file) return

        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = URL.createObjectURL(file)
        img.onload = () => {
            setPatternImages(prev => ({ ...prev, custom: img }))
            setFieldValue('thumbnailsMetadata.main_patternType', 'custom')
        }
    }

    return (
        <div className="mt-8">
            <h6 className="font-semibold text-lg mb-4">Main Thumbnail</h6>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        style={{ display: 'none' }}
                    />

                    <div className="border rounded bg-white overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '400px', aspectRatio: '1' }}>
                        {!isFontReady ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
                            </div>
                        ) : previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">Font not available</div>
                        )}
                    </div>
                    <div className="pt-2">
                        <ThumbnailStudioMetadata slug="main" />
                        <ThumbnailUploader canvasRef={canvasRef} bgColor={main_bgColor} slug="main" />
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {MENU_ITEMS.map(item => (
                            <Button
                                key={item.key}
                                type="button"
                                onClick={() => setActiveMenu(item.key)}
                                className={`px-4 py-2 rounded-lg ${activeMenu === item.key ? 'bg-gray-600 text-orange-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {activeMenu === 'background' && (
                            <BackgroundSettings
                                meta={meta}
                                setFieldValue={setFieldValue}
                                handleCustomPatternUpload={handleCustomPatternUpload}
                            />
                        )}


                        {activeMenu === 'title' && (
                            <TitleSettings />
                        )}

                        {activeMenu === 'characters' && (
                            <CharacterSettings meta={meta} setFieldValue={setFieldValue} lines={lines} />
                        )}

                        {activeMenu === 'watermark' && (
                            <WatermarkSettings meta={meta} setFieldValue={setFieldValue} />
                        )}
                    </div>
                </div>
            </div>
            <IconPickerDialog
                open={iconDialogOpen}
                onClose={() => setIconDialogOpen(false)}
                onSelect={iconName => {
                    setFieldValue('thumbnailsMetadata.main_patternIcon', iconName)
                    setFieldValue('thumbnailsMetadata.main_patternType', 'library')
                }}
            />
        </div>
    )

}

const InputWrapper = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col">
        <span className="text-sm font-medium mb-1">{label}</span>
        {children}
    </div>
)

export default ThumbnailPreviewStudio;
