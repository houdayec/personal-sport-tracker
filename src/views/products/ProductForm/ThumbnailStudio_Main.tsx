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

const CANVAS_SIZE = 2000
const PADDING = 100

const PATTERNS = [
    { name: 'none', label: 'None', src: '' },
    { name: 'custom', label: 'Upload SVG', src: '' },
    { name: 'library', label: 'Icon Library', src: '' },
]

const GRADIENT_PRESETS = [
    { name: 'blue-sky', color1: '#89CFF0', color2: '#0080FF', type: 'diagonal' },
    { name: 'sunrise', color1: '#FFD700', color2: '#FF4500', type: 'diagonal' },
    { name: 'emerald', color1: '#2ECC71', color2: '#16A085', type: 'diagonal' },
    { name: 'violet', color1: '#DA70D6', color2: '#800080', type: 'diagonal' },
    { name: 'midnight', color1: '#34495E', color2: '#2C3E50', type: 'diagonal' },
    // Nouveaux préréglages ajoutés
    { name: 'light-grey', color1: '#f8f8f8', color2: '#e8e8e8', type: 'diagonal' },
    { name: 'dark-grey', color1: '#333333', color2: '#1a1a1a', type: 'diagonal' },
    { name: 'pastel-pink', color1: '#FFB6C1', color2: '#FFDAB9', type: 'diagonal' },
    { name: 'pastel-green', color1: '#C1FFB6', color2: '#DAFFB9', type: 'diagonal' },
    { name: 'soft-yellow', color1: '#FFECB3', color2: '#FFD54F', type: 'diagonal' },
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
        const yTitle = PADDING + main_topOffset
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
        const spacing = 80
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

                    <div className="border rounded bg-white overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '600px', aspectRatio: '1' }}>
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
                            <>
                                <Card>
                                    <h5 className="font-semibold mb-2">Background</h5>
                                    <FormItem label="Pattern">
                                        <div className="flex flex-wrap gap-3 relative">
                                            {PATTERNS.map(p => (
                                                <div key={p.name} className="relative flex flex-col items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFieldValue('thumbnailsMetadata.main_patternType', p.name)}
                                                        className={`p-1 border rounded ${main_patternType === p.name ? 'border-blue-500' : 'border-gray-300'}`}
                                                    >
                                                        {p.src
                                                            ? <img src={p.src} alt={p.label} className="w-12 h-12 object-contain" />
                                                            : <div className="w-12 h-12 flex items-center justify-center text-gray-400">{p.label}</div>
                                                        }
                                                    </button>

                                                    {p.name === 'custom' && main_patternType === 'custom' && (
                                                        <div className="absolute left-0 top-full mt-2 z-10">
                                                            <Upload
                                                                type="file"
                                                                accept=".svg"
                                                                onChange={handleCustomPatternUpload}
                                                                className="text-xs"
                                                            />
                                                        </div>
                                                    )}

                                                    {p.name === 'library' && main_patternType === 'library' && (
                                                        <div className="absolute left-0 top-full mt-2 z-10">
                                                            <Button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFieldValue('thumbnailsMetadata.main_patternType', 'library')
                                                                    setIconDialogOpen(true)
                                                                }}
                                                                className="text-xs bg-orange-500 px-3 py-1 rounded"
                                                            >
                                                                Open Library
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </FormItem>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <InputWrapper label="Pattern Color"><Field name="thumbnailsMetadata.main_patternColor" type="color" component={Input} /></InputWrapper>
                                        <InputWrapper label="Pattern Opacity"><Field name="thumbnailsMetadata.main_patternOpacity">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={0.10} step={0.01} className="w-full" />}</Field></InputWrapper>
                                        <InputWrapper label="Background Color"><Field name="thumbnailsMetadata.main_bgColor" type="color" component={Input} /></InputWrapper>
                                        <InputWrapper label="Density / Scale">
                                            <Field name="thumbnailsMetadata.main_patternScale">
                                                {({ field }: FieldProps) => (
                                                    <input
                                                        {...field}
                                                        type="range"
                                                        min={0.1}
                                                        max={1}
                                                        step={0.05}
                                                        onChange={e => setFieldValue(field.name, parseFloat(e.target.value))}
                                                    />
                                                )}
                                            </Field>
                                        </InputWrapper>
                                        <label className="flex items-center space-x-2 mt-2">
                                            <Field name="thumbnailsMetadata.main_patternDiagonal" type="checkbox">
                                                {({ field }: FieldProps) => (
                                                    <input
                                                        {...field}
                                                        type="checkbox"
                                                        checked={!!field.value}
                                                        onChange={e => setFieldValue(field.name, e.target.checked)}
                                                    />
                                                )}
                                            </Field>
                                            <span className="text-sm">Diagonal repeat</span>
                                        </label>
                                    </div>
                                </Card>

                                <Card>
                                    <h5 className="font-semibold mb-2">Gradient</h5>
                                    <div className="flex flex-wrap items-center gap-4 mb-4">
                                        <label className="flex items-center space-x-2">
                                            <Field name="thumbnailsMetadata.main_gradientEnabled">
                                                {({ field }: FieldProps) => (
                                                    <input
                                                        {...field}
                                                        type="checkbox"
                                                        checked={!!field.value}
                                                        onChange={e => setFieldValue(field.name, e.target.checked)}
                                                    />
                                                )}
                                            </Field>
                                            <span className="text-sm font-medium">Active</span>
                                        </label>

                                        <label className="flex items-center space-x-2">
                                            <Field name="thumbnailsMetadata.main_gradientSync">
                                                {({ field }: FieldProps) => (
                                                    <input
                                                        {...field}
                                                        type="checkbox"
                                                        checked={!!field.value}
                                                        onChange={e => setFieldValue(field.name, e.target.checked)}
                                                    />
                                                )}
                                            </Field>
                                            <span className="text-sm font-medium">Sync Colors</span>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                        <label className="flex flex-col items-start text-sm">
                                            <span>Type</span>
                                            <Field
                                                as="select"
                                                name="thumbnailsMetadata.main_gradientType"
                                                className="input text-sm"
                                            >
                                                <option value="center">Center</option>
                                                <option value="diagonal">Bottom-Left → Top-Right</option>
                                            </Field>
                                        </label>
                                        <label className="flex flex-col items-center text-sm">
                                            <span>Color 1</span>
                                            <Field
                                                name="thumbnailsMetadata.main_gradientColor1"
                                                type="color"
                                                component={Input}
                                                className="w-10 h-10 p-0"
                                            />
                                        </label>

                                        <label className="flex flex-col items-center text-sm">
                                            <span>Color 2</span>
                                            <Field
                                                name="thumbnailsMetadata.main_gradientColor2"
                                                type="color"
                                                component={Input}
                                                className="w-10 h-10 p-0"
                                            />
                                        </label>
                                    </div>
                                    <h6 className="font-medium mb-2 mt-4">Presets</h6>
                                    <div className="flex flex-wrap gap-2">
                                        {GRADIENT_PRESETS.map(p => (
                                            <Button
                                                key={p.name}
                                                type="button"
                                                onClick={() => {
                                                    setFieldValue('thumbnailsMetadata.main_gradientEnabled', true)
                                                    setFieldValue('thumbnailsMetadata.main_gradientColor1', p.color1)
                                                    setFieldValue('thumbnailsMetadata.main_gradientColor2', p.color2)
                                                    setFieldValue('thumbnailsMetadata.main_gradientType', p.type)
                                                }}
                                                className="p-1 border rounded"
                                                style={{
                                                    background: `linear-gradient(135deg, ${p.color1} 0%, ${p.color2} 100%)`,
                                                    width: '40px',
                                                    height: '40px',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </Card>
                            </>
                        )}

                        {activeMenu === 'title' && (
                            <Card className="space-y-5">
                                {/* --- Featured ------------------------------------------------------ */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-semibold">Title (Featured)</h5>
                                        <span className="text-xs text-gray-500">Most-used settings</span>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* Title textarea spans full width on large screens */}
                                        <div className="lg:col-span-3">
                                            <InputWrapper label="Title (multiline)">
                                                <Field
                                                    name="thumbnailsMetadata.main_titleText"
                                                    as="textarea"
                                                    rows={2}
                                                    className="input"
                                                    placeholder="e.g. Star\nWars"
                                                />
                                            </InputWrapper>
                                        </div>

                                        <InputWrapper label="Scale">
                                            <Field name="thumbnailsMetadata.main_titleScale">
                                                {({ field }: FieldProps) => (
                                                    <input
                                                        {...field}
                                                        type="range"
                                                        min={0.1}
                                                        max={2}
                                                        step={0.1}
                                                        className="w-full"
                                                    />
                                                )}
                                            </Field>
                                        </InputWrapper>

                                        <InputWrapper label="Top Offset">
                                            <Field name="thumbnailsMetadata.main_topOffset">
                                                {({ field }: FieldProps) => (
                                                    <input
                                                        {...field}
                                                        type="range"
                                                        min={0}
                                                        max={200}
                                                        step={10}
                                                        className="w-full"
                                                    />
                                                )}
                                            </Field>
                                        </InputWrapper>

                                        <InputWrapper label="Text Color">
                                            <Field
                                                name="thumbnailsMetadata.main_titleColor"
                                                type="color"
                                                component={Input}
                                            />
                                        </InputWrapper>
                                    </div>
                                </div>

                                {/* --- Stroke -------------------------------------------------------- */}
                                <div>
                                    <h6 className="font-medium mb-2">Outline / Stroke</h6>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <InputWrapper label="Stroke Color">
                                            <Field
                                                name="thumbnailsMetadata.main_titleStrokeColor"
                                                type="color"
                                                component={Input}
                                            />
                                        </InputWrapper>

                                        <InputWrapper label="Stroke Width">
                                            <Field name="thumbnailsMetadata.main_titleStrokeWidth">
                                                {({ field }: FieldProps) => (
                                                    <input
                                                        {...field}
                                                        type="range"
                                                        min={0}
                                                        max={20}
                                                        step={1}
                                                        className="w-full"
                                                    />
                                                )}
                                            </Field>
                                        </InputWrapper>

                                        {/* Little preview chip */}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium mb-1">Preview</span>
                                            <div className="h-10 rounded border flex items-center justify-center text-xs text-gray-600">
                                                Stroke preview is shown on the main canvas
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Shadow (Advanced) -------------------------------------------- */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h6 className="font-medium">Shadow (Advanced)</h6>
                                        <Field name="thumbnailsMetadata.shadowColor">
                                            {({ form }) => (
                                                <button
                                                    type="button"
                                                    className="text-xs text-blue-600 hover:underline"
                                                    onClick={() => {
                                                        form.setFieldValue('thumbnailsMetadata.shadowColor', '#000000')
                                                        form.setFieldValue('thumbnailsMetadata.shadowBlur', 0)
                                                        form.setFieldValue('thumbnailsMetadata.shadowOffsetX', 0)
                                                        form.setFieldValue('thumbnailsMetadata.shadowOffsetY', 0)
                                                        form.setFieldValue('thumbnailsMetadata.shadowOpacity', 0.3)
                                                    }}
                                                >
                                                    Reset to defaults
                                                </button>
                                            )}
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Controls */}
                                        <div className="space-y-4 lg:col-span-1">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <InputWrapper label="Shadow Color">
                                                    <Field
                                                        name="thumbnailsMetadata.shadowColor"
                                                        type="color"
                                                        component={Input}
                                                    />
                                                </InputWrapper>

                                                <InputWrapper label="Opacity">
                                                    <Field name="thumbnailsMetadata.shadowOpacity">
                                                        {({ field }: FieldProps) => (
                                                            <input
                                                                {...field}
                                                                type="range"
                                                                min={0}
                                                                max={1}
                                                                step={0.05}
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </Field>
                                                </InputWrapper>

                                                <InputWrapper label="Blur">
                                                    <Field name="thumbnailsMetadata.shadowBlur">
                                                        {({ field }: FieldProps) => (
                                                            <input
                                                                {...field}
                                                                type="range"
                                                                min={0}
                                                                max={50}
                                                                step={1}
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </Field>
                                                </InputWrapper>

                                                <InputWrapper label="Offset X">
                                                    <Field name="thumbnailsMetadata.shadowOffsetX">
                                                        {({ field }: FieldProps) => (
                                                            <input
                                                                {...field}
                                                                type="range"
                                                                min={-100}
                                                                max={100}
                                                                step={1}
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </Field>
                                                </InputWrapper>

                                                <InputWrapper label="Offset Y">
                                                    <Field name="thumbnailsMetadata.shadowOffsetY">
                                                        {({ field }: FieldProps) => (
                                                            <input
                                                                {...field}
                                                                type="range"
                                                                min={-100}
                                                                max={100}
                                                                step={1}
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </Field>
                                                </InputWrapper>
                                            </div>
                                        </div>

                                        {/* Presets + Live chip */}
                                        <div className="lg:col-span-2">
                                            <h6 className="font-medium mb-3">Shadow Presets</h6>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                                {SHADOW_PRESETS.map((p) => (
                                                    <Field key={p.name} name="thumbnailsMetadata.shadowColor">
                                                        {({ form }) => (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    form.setFieldValue('thumbnailsMetadata.shadowColor', p.shadowColor)
                                                                    form.setFieldValue('thumbnailsMetadata.shadowBlur', p.shadowBlur)
                                                                    form.setFieldValue('thumbnailsMetadata.shadowOffsetX', p.shadowOffsetX)
                                                                    form.setFieldValue('thumbnailsMetadata.shadowOffsetY', p.shadowOffsetY)
                                                                    form.setFieldValue('thumbnailsMetadata.shadowOpacity', p.shadowOpacity)
                                                                }}
                                                                className="p-2 border rounded bg-white flex flex-col items-center justify-center hover:border-blue-400 transition"
                                                            >
                                                                <div
                                                                    className="w-10 h-10 rounded bg-white"
                                                                    style={{
                                                                        backgroundColor: '#fff',
                                                                        boxShadow: `${p.shadowOffsetX}px ${p.shadowOffsetY}px ${p.shadowBlur}px ${hexToRgbaString(
                                                                            p.shadowColor,
                                                                            p.shadowOpacity
                                                                        )}`,
                                                                    }}
                                                                    title={p.name}
                                                                />
                                                                <span className="mt-1 text-[10px] text-gray-600 truncate w-full text-center">
                                                                    {p.name}
                                                                </span>
                                                            </button>
                                                        )}
                                                    </Field>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                        )}

                        {activeMenu === 'characters' && (
                            <Card>
                                <h5 className="font-semibold mb-2">Characters</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <InputWrapper label="Alphabet Size"><Field name="thumbnailsMetadata.main_charScale">{({ field }: FieldProps) => <input {...field} type="range" min={0.05} max={2} step={0.05} className="w-full" />}</Field></InputWrapper>
                                    <InputWrapper label="Color"><Field name="thumbnailsMetadata.main_charColor" type="color" component={Input} /></InputWrapper>
                                    <InputWrapper label="Vertical Offset">
                                        <Field name="thumbnailsMetadata.main_charVerticalOffset">
                                            {({ field }: FieldProps) => (
                                                <input {...field} type="range" min={-100} max={100} step={5} className="w-full" />
                                            )}
                                        </Field>
                                    </InputWrapper>
                                </div>
                                <FormItem label="Character Sets">
                                    <div className="flex flex-wrap gap-4">
                                        {['Uppercase', 'Lowercase', 'Numbers', 'Specials'].map((opt, key) => (
                                            <label key={key} className="flex items-center space-x-2">
                                                <Field
                                                    name={`thumbnailsMetadata.main_show${opt}` as keyof Product}
                                                    type="checkbox"
                                                    render={({ field }: FieldProps) => (
                                                        <input
                                                            {...field}
                                                            type="checkbox"
                                                            checked={!!field.value}
                                                            onChange={e => setFieldValue(field.name, e.target.checked)}
                                                        />
                                                    )}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </FormItem>
                                {!main_showUppercase && !main_showLowercase && !main_showNumbers && !main_showSpecials && (
                                    <FormItem label="Custom main_charset (newline separated)">
                                        <Field name="thumbnailsMetadata.main_charset" component={Input} />
                                    </FormItem>
                                )}
                            </Card>
                        )}

                        {activeMenu === 'watermark' && (
                            <Card>
                                <h5 className="font-semibold mb-2">Watermark</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <InputWrapper label="Color">
                                        <Field name="thumbnailsMetadata.main_watermarkColor" type="color" component={Input} />
                                    </InputWrapper>
                                    <InputWrapper label="Opacity">
                                        <Field name="thumbnailsMetadata.main_watermarkOpacity">
                                            {({ field }: FieldProps) => (
                                                <input {...field} type="range" min={0} max={0.1} step={0.01} className="w-full" />
                                            )}
                                        </Field>
                                    </InputWrapper>
                                    <InputWrapper label="Version">
                                        <Field name="thumbnailsMetadata.main_watermarkVersion" as="select" className="input">
                                            <option value="black">Black</option>
                                            <option value="white">White</option>
                                        </Field>
                                    </InputWrapper>
                                </div>
                            </Card>

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
