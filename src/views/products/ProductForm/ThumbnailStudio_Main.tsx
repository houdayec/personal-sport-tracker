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
}

const ThumbnailPreviewStudio = () => {
    const { values, setFieldValue } = useFormikContext<{ sku: string; thumbnailsMetadata: ThumbnailsMetadata }>()
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [fontLoaded, setFontLoaded] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [patternImages, setPatternImages] = useState<Record<string, HTMLImageElement>>({})
    const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null)

    const meta = values.thumbnailsMetadata || {}
    const {
        main_titleText = 'Font Name', main_bgColor = '#ffffff',
        main_patternType = 'none', main_patternColor = '#000000', main_patternOpacity = 0.2,
        main_titleColor = '#000000', main_titleStrokeColor = '#000000', main_titleStrokeWidth = 0,
        main_charColor = '#333333', main_titleScale = 0.7, main_charScale = 1.0, main_topOffset = 150,
        main_showUppercase = true, main_showLowercase = false, main_showNumbers = true, main_showSpecials = false,
        main_watermarkOpacity = 0.02,
        main_watermarkColor = '#000000',
        main_charset = '',
    } = meta

    // Load watermark image
    useEffect(() => {
        const img = new Image()
        img.src = '/img/others/fontmaze-watermark.png'
        img.onload = () => setWatermarkImg(img)
    }, [])

    // Preload pattern images
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
    if (main_showUppercase && main_showLowercase) lines = [...letterPairs]
    else if (main_showUppercase) lines = [...uppercaseLines]
    else if (main_showLowercase) lines = [...lowercaseLines]
    if (main_showNumbers) lines.push(numberLine)
    if (main_showSpecials) lines.push(specialLine)
    if (lines.length === 0) lines = main_charset.split('\n').filter(Boolean) || [...letterPairs]

    // Draw canvas
    useEffect(() => {
        if (!fontLoaded || !watermarkImg) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        // Clear + background
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.fillStyle = main_bgColor
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        // Draw pattern
        if (main_patternType !== 'none' && patternImages[main_patternType]) {
            const img = patternImages[main_patternType]
            ctx.save()
            ctx.globalAlpha = main_patternOpacity
            const pat = ctx.createPattern(img, 'repeat')!
            ctx.fillStyle = pat
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.globalCompositeOperation = 'source-in'
            ctx.fillStyle = main_patternColor
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.restore()
        }

        // Draw watermark image with tint and opacity
        ctx.save()

        // Resize watermark if needed
        if (watermarkImg) {
            ctx.save()
            ctx.globalAlpha = main_watermarkOpacity
            ctx.drawImage(watermarkImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.restore()
        }

        // Title text
        const titleArea = CANVAS_SIZE * 0.25
        const yTitle = PADDING + main_topOffset
        const tf = Math.floor(titleArea * main_titleScale)
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.font = `${tf}px ProductFont, sans-serif`
        ctx.fillStyle = main_titleColor
        ctx.fillText(main_titleText, CANVAS_SIZE / 2, yTitle)
        if (main_titleStrokeWidth) {
            ctx.lineWidth = main_titleStrokeWidth
            ctx.strokeStyle = main_titleStrokeColor
            ctx.strokeText(main_titleText, CANVAS_SIZE / 2, yTitle)
        }

        // Characters
        const topChars = yTitle + tf + PADDING
        const bottomHeight = CANVAS_SIZE - topChars - PADDING
        const count = lines.length
        const spacing = 80
        const baseF = Math.floor((bottomHeight - spacing * (count - 1)) / count)
        let cf = Math.floor(baseF * main_charScale)
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillStyle = main_charColor
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
    }, [fontLoaded, watermarkImg, main_bgColor, main_patternType, main_patternColor, main_patternOpacity,
        main_titleText, main_titleColor, main_titleStrokeColor, main_titleStrokeWidth,
        main_titleScale, main_charScale, main_topOffset, main_showUppercase, main_showLowercase, main_showNumbers, main_showSpecials, main_charset,
        patternImages, main_watermarkColor, main_watermarkOpacity])


    return (
        <div className="mt-8">
            <h6 className="font-semibold text-lg mb-4">🖼️ Miniature Generator</h6>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div>
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
                    {/* Upload */}
                    <div className="pt-2">
                        <ThumbnailUploader canvasRef={canvasRef} main_bgColor={main_bgColor} slug="main" />
                    </div>
                </div>

                {/* Controls */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Section: Background */}
                    <div>
                        <h5 className="font-semibold mb-2">🎨 Background</h5>
                        <FormItem label="Pattern">
                            <div className="flex flex-wrap gap-3">
                                {PATTERNS.map(p => (
                                    <button
                                        key={p.name}
                                        type="button"
                                        onClick={() => setFieldValue('thumbnailsMetadata.main_patternType', p.name)}
                                        className={`p-1 border rounded ${main_patternType === p.name ? 'border-blue-500' : 'border-gray-300'}`}
                                    >
                                        {p.src
                                            ? <img src={p.src} alt={p.label} className="w-12 h-12 object-contain" />
                                            : <div className="w-12 h-12 flex items-center justify-center text-gray-400">None</div>
                                        }
                                    </button>
                                ))}
                            </div>
                        </FormItem>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <InputWrapper label="Pattern Color"><Field name="thumbnailsMetadata.main_patternColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Pattern Opacity"><Field name="thumbnailsMetadata.main_patternOpacity">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={1} step={0.05} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Background Color"><Field name="thumbnailsMetadata.main_bgColor" type="color" component={Input} /></InputWrapper>
                        </div>
                    </div>

                    {/* Section: Title */}
                    <div>
                        <h5 className="font-semibold mb-2">📝 Title</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <InputWrapper label="Text"><Field name="thumbnailsMetadata.main_titleText" component={Input} /></InputWrapper>
                            <InputWrapper label="Scale"><Field name="thumbnailsMetadata.main_titleScale">{({ field }: FieldProps) => <input {...field} type="range" min={0.1} max={2} step={0.1} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Top Offset"><Field name="thumbnailsMetadata.main_topOffset">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={200} step={10} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Color"><Field name="thumbnailsMetadata.main_titleColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Stroke Color"><Field name="thumbnailsMetadata.main_titleStrokeColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Stroke Width"><Field name="thumbnailsMetadata.main_titleStrokeWidth">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={20} step={1} className="w-full" />}</Field></InputWrapper>
                        </div>
                    </div>

                    {/* Section: Watermark */}
                    <div>
                        <h5 className="font-semibold mb-2">💧 Watermark</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InputWrapper label="Color"><Field name="thumbnailsMetadata.main_watermarkColor" type="color" component={Input} /></InputWrapper>
                            <InputWrapper label="Opacity"><Field name="thumbnailsMetadata.main_watermarkOpacity">{({ field }: FieldProps) => <input {...field} type="range" min={0} max={0.10} step={0.01} className="w-full" />}</Field></InputWrapper>
                        </div>
                    </div>

                    {/* Section: Characters */}
                    <div>
                        <h5 className="font-semibold mb-2">🔠 Characters</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <InputWrapper label="Alphabet Size"><Field name="thumbnailsMetadata.main_charScale">{({ field }: FieldProps) => <input {...field} type="range" min={0.1} max={2} step={0.1} className="w-full" />}</Field></InputWrapper>
                            <InputWrapper label="Color"><Field name="thumbnailsMetadata.main_charColor" type="color" component={Input} /></InputWrapper>
                        </div>
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
                        {!main_showUppercase && !main_showLowercase && !main_showNumbers && !main_showSpecials && (
                            <FormItem label="Custom main_charset (newline separated)">
                                <Field name="thumbnailsMetadata.main_charset" component={Input} />
                            </FormItem>
                        )}
                    </div>
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
