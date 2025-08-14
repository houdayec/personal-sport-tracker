import { useEffect, useState, useRef, useCallback } from 'react'
import { Field, useFormikContext, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { storage } from '@/firebase'
import { ref, getDownloadURL } from 'firebase/storage'
import ThumbnailUploader from './ThumbnailUploader'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Product, ThumbnailsMetadata } from '@/@types/product'
import { drawGradient, getCharacterLines, hexToRgba, ICON_PALETTE } from '@/utils/thumbnailUtils'
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

// The isFontReady and productFontFamily props are now passed from the parent component
const ThumbnailPreviewStudio = ({ isFontReady, productFontFamily }: { isFontReady: boolean, productFontFamily: string }) => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [patternImages, setPatternImages] = useState<Record<string, HTMLImageElement>>({})
    const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null)
    const [iconDialogOpen, setIconDialogOpen] = useState(false)

    const meta = values.thumbnailsMetadata ?? {} as ThumbnailsMetadata
    const {
        main_titleText = 'Font Name', main_bgColor = '#ffffff',
        main_patternType = 'none', main_patternColor = '#000000', main_patternOpacity = 0.2,
        main_titleColor = '#000000', main_titleStrokeColor = '#000000', main_titleStrokeWidth = 0,
        main_charColor = '#333333', main_titleScale = 0.7, main_charScale = 1.0, main_topOffset = 150,
        main_showUppercase = true, main_showLowercase = false, main_showNumbers = true, main_showSpecials = false,
        main_watermarkOpacity = 0.01,
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
        main_patternScale = 0.4,
        main_patternDiagonal = true,
    } = meta

    // Load watermark image
    useEffect(() => {
        const img = new Image()
        img.src = '/img/others/fontmaze-watermark.png'
        img.onload = () => setWatermarkImg(img)
    }, [])

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

    // Preload pattern images
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

    // The font loading logic is now handled by the parent component.
    // This component now depends on the 'isFontReady' prop to know when to render.

    // Compute character lines once
    const lines = getCharacterLines(meta)

    // Schedules and draws the thumbnail on each animation frame for smooth updates
    const draw = useCallback(() => {
        // Now using the 'isFontReady' prop instead of an internal state
        if (!isFontReady || !watermarkImg) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        // Clear + background
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.fillStyle = main_bgColor
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        // Gradient overlay
        if (main_gradientEnabled) {
            drawGradient(
                ctx,
                CANVAS_SIZE,
                CANVAS_SIZE,
                [main_gradientColor1, main_gradientColor2],
                main_gradientType
            )
        }

        // Pattern fill
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

        // Watermark
        ctx.save()
        ctx.globalAlpha = main_watermarkOpacity
        ctx.drawImage(watermarkImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.restore()

        // Title
        const titleArea = CANVAS_SIZE * 0.25
        const yTitle = PADDING + main_topOffset
        const titleFont = Math.floor(titleArea * main_titleScale)

        ctx.save()
        ctx.shadowColor = hexToRgba(shadowColor, shadowOpacity)
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

        // Characters
        const topChars = yTitle + totalTitleHeight + PADDING
        const bottomH = CANVAS_SIZE - topChars - PADDING
        const count = lines.length
        const spacing = 80
        const baseFont = Math.floor((bottomH - spacing * (count - 1)) / count)
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
        const startY = topChars + (bottomH - totalH) / 2
        lines.forEach((line, i) => ctx.fillText(line, CANVAS_SIZE / 2, startY + i * (charFont + spacing)))

        // Update preview
        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [
        isFontReady, // This is the new dependency
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
        productFontFamily
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

                <div className="lg:col-span-2 space-y-4">
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
                        <h5 className="font-semibold mb-2. mt-2">Gradient</h5>
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
                    </Card>
                    <Card>
                        <h5 className="font-semibold mb-2">Title</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <InputWrapper label="Title (multiline)">
                                <Field name="thumbnailsMetadata.main_titleText" as="textarea" rows={2} className="input" />
                            </InputWrapper>
                            <InputWrapper label="Scale"><Field name="thumbnailsMetadata.main_titleScale">{({ field }: FieldProps) => <input {...field} type="range" min={0.1} max={2} step={0.1} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Top Offset"><Field name="thumbnailsMetadata.main_topOffset">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={200} step={10} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Color"><Field name="thumbnailsMetadata.main_titleColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Stroke Color"><Field name="thumbnailsMetadata.main_titleStrokeColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Stroke Width"><Field name="thumbnailsMetadata.main_titleStrokeWidth">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={20} step={1} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Shadow Color">
                                <Field name="thumbnailsMetadata.main.shadowColor" type="color" component={Input} />
                            </InputWrapper>
                            <InputWrapper label="Shadow Opacity">
                                <Field name="thumbnailsMetadata.main.shadowOpacity">
                                    {({ field }: FieldProps) => <input {...field} type="range" min={0} max={1} step={0.05} className="w-full" />}
                                </Field>
                            </InputWrapper>
                            <InputWrapper label="Shadow Blur">
                                <Field name="thumbnailsMetadata.main.shadowBlur">
                                    {({ field }: FieldProps) => <input {...field} type="range" min={0} max={50} step={1} className="w-full" />}
                                </Field>
                            </InputWrapper>
                            <InputWrapper label="Shadow X Offset">
                                <Field name="thumbnailsMetadata.main.shadowOffsetX">
                                    {({ field }: FieldProps) => <input {...field} type="range" min={-100} max={100} step={1} className="w-full" />}
                                </Field>
                            </InputWrapper>
                            <InputWrapper label="Shadow Y Offset">
                                <Field name="thumbnailsMetadata.main.shadowOffsetY">
                                    {({ field }: FieldProps) => <input {...field} type="range" min={-100} max={100} step={1} className="w-full" />}
                                </Field>
                            </InputWrapper>

                        </div>
                    </Card>

                    <Card>
                        <h5 className="font-semibold mb-2">Watermark</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InputWrapper label="Color"><Field name="thumbnailsMetadata.main_watermarkColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Opacity"><Field name="thumbnailsMetadata.main_watermarkOpacity">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={0.10} step={0.01} className="w-full" />}</Field></InputWrapper>
                        </div>
                    </Card>

                    <Card>
                        <h5 className="font-semibold mb-2">Characters</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <InputWrapper label="Alphabet Size"><Field name="thumbnailsMetadata.main_charScale">{({ field }: FieldProps) => <input {...field} type="range" min={0.05} max={2} step={0.05} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Color"><Field name="thumbnailsMetadata.main_charColor" type="color" component={Input} /></InputWrapper>
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
