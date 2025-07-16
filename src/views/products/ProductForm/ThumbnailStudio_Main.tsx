import { useEffect, useState, useRef } from 'react'
import { Field, useFormikContext, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { storage } from '@/firebase'
import { ref, getDownloadURL } from 'firebase/storage'
import ThumbnailUploader from './ThumbnailUploader'

const CANVAS_SIZE = 2000
const PADDING = 80

const PATTERNS = [
    { name: 'none', label: 'None', src: '' },
    { name: 'maze', label: 'Maze', src: '/img/others/maze.svg' },
]

type ThumbnailsMetadata = {
    titleText?: string
    bgColor?: string
    patternType?: string
    patternColor?: string
    patternOpacity?: number
    titleColor?: string
    titleStrokeColor?: string
    titleStrokeWidth?: number
    charColor?: string
    titleScale?: number
    charScale?: number
    topOffset?: number
    showUppercase?: boolean
    showLowercase?: boolean
    showNumbers?: boolean
    showSpecials?: boolean
    charset?: string
}

const ThumbnailPreviewStudio = () => {
    const { values, setFieldValue } = useFormikContext<{ sku: string; thumbnailsMetadata: ThumbnailsMetadata }>()
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [fontLoaded, setFontLoaded] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [patternImages, setPatternImages] = useState<Record<string, HTMLImageElement>>({})

    const meta = values.thumbnailsMetadata || {}
    const {
        titleText = 'Font Name', bgColor = '#ffffff',
        patternType = 'none', patternColor = '#000000', patternOpacity = 0.2,
        titleColor = '#000000', titleStrokeColor = '#000000', titleStrokeWidth = 0,
        charColor = '#333333', titleScale = 0.7, charScale = 1.0, topOffset = 150,
        showUppercase = true, showLowercase = false, showNumbers = true, showSpecials = false,
        charset = '',
    } = meta

    useEffect(() => {
        PATTERNS.forEach(p => {
            if (!p.src) return;
            const img = new Image();
            img.crossOrigin = 'anonymous';     // avoid tainting canvas
            img.src = p.src;
            img.onload = () => {
                setPatternImages(prev => ({ ...prev, [p.name]: img }));
            };
            img.onerror = err => console.error('Pattern load failed', p.name, err);
        });
    }, []);

    // Preload SVG patterns
    useEffect(() => {
        if (!values.sku) {
            setFontLoaded(true)
            return
        }
        setFontLoaded(false)
        getDownloadURL(ref(storage, `products/${values.sku}/files/font.ttf`))
            .then(url => new FontFace('ProductFont', `url(${url})`).load())
            .then(face => document.fonts.add(face))
            .catch(() => { })
            .finally(() => setFontLoaded(true))
    }, [values.sku])

    // Compute lines of characters
    const letterPairs = ['Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj', 'Kk Ll Mm Nn Oo Pp Qq Rr', 'Ss Tt Uu Vv Ww Xx Yy Zz']
    const uppercaseLines = ['A B C D E F G H I J', 'K L M N O P Q R', 'S T U V W X Y Z']
    const lowercaseLines = uppercaseLines.map(l => l.toLowerCase())
    const numberLine = '0 1 2 3 4 5 6 7 8 9'
    const specialLine = '! @ # $ % ^ & * ( ) - _ = +'
    let lines: string[] = []
    if (showUppercase && showLowercase) lines = [...letterPairs]
    else if (showUppercase) lines = [...uppercaseLines]
    else if (showLowercase) lines = [...lowercaseLines]
    if (showNumbers) lines.push(numberLine)
    if (showSpecials) lines.push(specialLine)
    if (lines.length === 0) lines = charset.split('\n').filter(Boolean) || [...letterPairs]

    // Draw canvas
    useEffect(() => {
        if (!fontLoaded) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        // Clear + background
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        // Draw pattern
        if (patternType !== 'none' && patternImages[patternType]) {
            const img = patternImages[patternType]
            ctx.save()
            ctx.globalAlpha = patternOpacity
            const pat = ctx.createPattern(img, 'repeat')!
            ctx.fillStyle = pat
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.globalCompositeOperation = 'source-in'
            ctx.fillStyle = patternColor
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.restore()
        }

        // Watermark
        ctx.save()
        const [r, g, b] = [patternColor.slice(1, 3), patternColor.slice(3, 5), patternColor.slice(5, 7)].map(h => parseInt(h, 16))
        ctx.fillStyle = `rgba(${r},${g},${b},${patternOpacity})`
        ctx.font = `${100 * titleScale}px ProductFont, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2); ctx.rotate(-Math.PI / 4)
        for (let x = -CANVAS_SIZE; x < CANVAS_SIZE * 2; x += 400) for (let y = -CANVAS_SIZE; y < CANVAS_SIZE * 2; y += 400) ctx.fillText('fontmaze', x, y)
        ctx.restore()

        // Title
        const titleArea = CANVAS_SIZE * 0.25
        const yTitle = PADDING + topOffset
        const tf = Math.floor(titleArea * titleScale)
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.font = `${tf}px ProductFont, sans-serif`
        ctx.fillStyle = titleColor
        ctx.fillText(titleText, CANVAS_SIZE / 2, yTitle)
        if (titleStrokeWidth) {
            ctx.lineWidth = titleStrokeWidth
            ctx.strokeStyle = titleStrokeColor
            ctx.strokeText(titleText, CANVAS_SIZE / 2, yTitle)
        }

        // Characters
        const topChars = yTitle + tf + PADDING
        const bottomHeight = CANVAS_SIZE - topChars - PADDING
        const count = lines.length
        const spacing = 80
        const baseF = Math.floor((bottomHeight - spacing * (count - 1)) / count)
        let cf = Math.floor(baseF * charScale)
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillStyle = charColor
        ctx.font = `${cf}px ProductFont, sans-serif`
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width))
        if (maxW > CANVAS_SIZE - 2 * PADDING) {
            const sc = (CANVAS_SIZE - 2 * PADDING) / maxW
            cf = Math.floor(cf * sc)
            ctx.font = `${cf}px ProductFont, sans-serif`
        }
        const totalH = cf * count + spacing * (count - 1)
        const sy = topChars + (bottomHeight - totalH) / 2
        lines.forEach((l, i) => ctx.fillText(l, CANVAS_SIZE / 2, sy + i * (cf + spacing)))

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [fontLoaded, bgColor, patternType, patternColor, patternOpacity,
        titleText, titleColor, titleStrokeColor, titleStrokeWidth,
        titleScale, charScale, topOffset, showUppercase, showLowercase, showNumbers, showSpecials, charset,
        patternImages
    ])

    return (
        <div className="mt-8">
            <h6 className="font-semibold mb-2">🖼️ Miniature Generator</h6>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    style={{ display: 'none' }}
                />

                {/* Preview */}
                <div className="border rounded bg-white overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '600px', aspectRatio: '1' }}>
                    {previewUrl
                        ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">Loading…</div>
                    }
                </div>
                {/* Controls */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Pattern Picker */}
                    <FormItem label="Background Pattern">
                        <div className="flex flex-wrap gap-3">
                            {PATTERNS.map(p => (
                                <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => setFieldValue('thumbnailsMetadata.patternType', p.name)}
                                    className={`p-1 border rounded ${patternType === p.name ? 'border-blue-500' : 'border-gray-300'}`}
                                >
                                    {p.src
                                        ? <img src={p.src} alt={p.label} className="w-12 h-12 object-contain" />
                                        : <div className="w-12 h-12 flex items-center justify-center text-gray-400">None</div>
                                    }
                                </button>
                            ))}
                        </div>
                    </FormItem>
                    <FormItem label="Pattern Color">
                        <Field
                            name="thumbnailsMetadata.patternColor"
                            type="color"
                            component={Input}
                        />
                    </FormItem>
                    <FormItem label="Pattern Opacity">
                        <Field name="thumbnailsMetadata.patternOpacity">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    className="w-full"
                                    onChange={e => {
                                        console.log('Pattern opacity change:', e.target.value)
                                        field.onChange(e)
                                    }}
                                />
                            )}
                        </Field>
                    </FormItem>
                    {/* Title Controls */}
                    <FormItem label="Title & Style">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <InputWrapper label="Text"><Field name="thumbnailsMetadata.titleText" component={Input} /></InputWrapper>
                            <InputWrapper label="Scale"><Field name="thumbnailsMetadata.titleScale">{({ field }: FieldProps) => <input {...field} type="range" min={0.1} max={2} step={0.1} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Stroke W"><Field name="thumbnailsMetadata.titleStrokeWidth">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={20} step={1} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Stroke Color"><Field name="thumbnailsMetadata.titleStrokeColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Top Offset"><Field name="thumbnailsMetadata.topOffset">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={200} step={10} className="w-full" />}</Field></InputWrapper>
                        </div>
                    </FormItem>
                    {/* Alphabet & Watermark Controls */}
                    <FormItem label="Alphabet & Watermark">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <InputWrapper label="Alphabet Size"><Field name="thumbnailsMetadata.charScale">{({ field }: FieldProps) => <input {...field} type="range" min={0.1} max={2} step={0.1} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="BG Color"><Field name="thumbnailsMetadata.bgColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Watermark Color"><Field name="thumbnailsMetadata.watermarkColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Watermark Opacity"><Field name="thumbnailsMetadata.watermarkOpacity">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={0.5} step={0.05} className="w-full" />}</Field></InputWrapper>
                        </div>
                    </FormItem>
                    {/* Char Sets */}
                    <FormItem label="Character Sets">
                        <div className="flex flex-wrap gap-4">
                            {['Uppercase', 'Lowercase', 'Numbers', 'Specials'].map((opt, key) => (
                                <label key={key} className="flex items-center space-x-2">
                                    <Field
                                        name={`thumbnailsMetadata.show${opt}` as any}
                                        type="checkbox"
                                        render={({ field }: FieldProps) => <input
                                            {...field}
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={e => setFieldValue(field.name, e.target.checked)}
                                        />}
                                    />
                                    <span>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </FormItem>
                    {/* Custom Charset */}
                    {!showUppercase && !showLowercase && !showNumbers && !showSpecials &&
                        <FormItem label="Custom Charset (newline separated)"><Field name="thumbnailsMetadata.charset" component={Input} /></FormItem>
                    }
                    {/* Text Colors */}
                    <div className="flex flex-wrap gap-4">
                        <InputWrapper label="Title Color"><Field name="thumbnailsMetadata.titleColor" type="color" component={Input} /></InputWrapper>
                        <InputWrapper label="Char Color"><Field name="thumbnailsMetadata.charColor" type="color" component={Input} /></InputWrapper>
                    </div>
                    <ThumbnailUploader canvasRef={canvasRef} bgColor={bgColor} title="main-square" slug='main' />

                </div>
            </div>
        </div>
    )
}

// Helper for consistent label + control
const InputWrapper = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col">
        <span className="text-sm font-medium mb-1">{label}</span>
        {children}
    </div>
)

export default ThumbnailPreviewStudio
