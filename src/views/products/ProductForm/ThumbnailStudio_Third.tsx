import { useEffect, useState, useRef, useCallback } from 'react'
import { useFormikContext, Field, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import ThumbnailUploader from './ThumbnailUploader'
import { Product, ThumbnailsMetadata } from '@/@types/product'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Card, Button } from '@/components/ui'
import { Loader2 } from 'lucide-react'

const PADDING = 100
const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 2000

const TEXT_BOX = {
    x: 500,
    y: 0,
    width: 2000,
    height: 2000,
}

const ThumbnailStudioThirdCharacters = ({
    isFontReady,
    productFontFamily,
}: {
    isFontReady: boolean
    productFontFamily: string
}) => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
    const [showCharactersMeta, setShowCharactersMeta] = useState(false)

    // The redundant local state for isFontReady and productFontFamily have been removed.

    const metadata = (values.thumbnailsMetadata || {}) as ThumbnailsMetadata
    const fontColor = metadata.characters_preview_charColor || '#000000'
    const showTextBox = metadata.characters_preview_showTextAreaBox === true
    const yOffset = metadata.characters_preview_yOffset || 0
    const lineHeightRatio = metadata.characters_preview_lineHeightRatio || 1.5
    const charLines = metadata.characters_preview_charLines || 4

    // New metadata fields for manual font size control
    const autoFontSize = metadata.characters_preview_autoFontSize ?? true;
    const manualFontSize = metadata.characters_preview_manualFontSize || 100;

    const main_showUppercase = metadata.characters_preview_showUppercase ?? true
    const showLowercase = metadata.characters_preview_showLowercase ?? true
    const showNumbers = metadata.characters_preview_showNumbers ?? true
    const showSpecials = metadata.characters_preview_showSpecials ?? true

    useEffect(() => {
        if (!values.thumbnailsMetadata?.characters_preview_charLines) {
            setFieldValue('thumbnailsMetadata.characters_preview_charLines', 4)
        }
    }, [setFieldValue, values.thumbnailsMetadata?.characters_preview_charLines])

    // Load background image
    useEffect(() => {
        const img = new Image()
        img.src = '/img/others/thumbnails-characters.png'
        img.onload = () => setBgImage(img)
    }, [])

    const draw = useCallback(() => {
        if (!bgImage || !isFontReady) {
            return;
        }

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        if (showTextBox) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
            ctx.fillRect(TEXT_BOX.x, TEXT_BOX.y, TEXT_BOX.width, TEXT_BOX.height)
        }

        const paddedBox = {
            x: TEXT_BOX.x + PADDING,
            y: TEXT_BOX.y + PADDING,
            width: TEXT_BOX.width - 2 * PADDING,
            height: TEXT_BOX.height - 2 * PADDING,
        }

        const uppercase = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' ')
        const lowercase = 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' ')
        const numbers = '0 1 2 3 4 5 6 7 8 9'.split(' ')
        const specials = '! @ # $ % ^ & * ( ) - _ = +'.split(' ')

        const splitIntoLines = (arr: string[], lineCount: number) => {
            const perLine = Math.ceil(arr.length / lineCount)
            const res: string[] = []
            for (let i = 0; i < lineCount; i++) {
                const slice = arr.slice(i * perLine, (i + 1) * perLine)
                if (slice.length) res.push(slice.join(' '))
            }
            return res
        }

        let lines: string[] = []
        if (main_showUppercase && showLowercase) {
            const pairs = uppercase.map((u, i) => `${u}${lowercase[i]}`)
            lines = splitIntoLines(pairs, charLines)
        } else if (main_showUppercase) {
            lines = splitIntoLines(uppercase, charLines)
        } else if (showLowercase) {
            lines = splitIntoLines(lowercase, charLines)
        }
        if (showNumbers) lines.push(numbers.join(' '))
        if (showSpecials) lines.push(...splitIntoLines(specials, 2))
        if (lines.length === 0) {
            const pairs = uppercase.map((u, i) => `${u}${lowercase[i]}`)
            lines = splitIntoLines(pairs, charLines)
        }

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = fontColor

        let finalFontSize = manualFontSize;

        if (autoFontSize) {
            let testFontSize = 10;
            while (true) {
                ctx.font = `${testFontSize}px "${productFontFamily}", sans-serif`
                const heights = testFontSize * 1.2 * lines.length
                const widths = lines.map(line => ctx.measureText(line).width)
                const maxWidth = Math.max(...widths)
                if (heights > paddedBox.height || maxWidth > paddedBox.width) break
                testFontSize += 1
            }
            finalFontSize = testFontSize - 1;
        }

        ctx.font = `${finalFontSize}px "${productFontFamily}", sans-serif`

        const lineHeight = finalFontSize * lineHeightRatio

        const supportedLines = lines.map(line => {
            return line
                .split(' ')
                .filter(char => ctx.measureText(char).width > 0)
                .join(' ')
        }).filter(Boolean)

        const totalHeight = supportedLines.length * lineHeight
        const startY = paddedBox.y + (paddedBox.height - totalHeight) / 2 + lineHeight / 2 + yOffset

        supportedLines.forEach((line, i) => {
            const y = startY + i * lineHeight
            ctx.fillText(line, paddedBox.x + paddedBox.width / 2, y)
        })

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [metadata, yOffset, bgImage, isFontReady, productFontFamily, autoFontSize, manualFontSize, charLines])

    useEffect(() => {
        const id = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(id)
    }, [draw])

    return (
        <div className="mt-8">
            <h6 className="font-semibold mb-2">🖼️ Characters Thumbnail</h6>
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{ display: 'none' }}
            />
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:max-w-md flex-shrink-0">
                    <div className="border rounded bg-white overflow-hidden max-w-xl w-full aspect-[3/2]">
                        {!isFontReady || !bgImage ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
                            </div>
                        ) : previewUrl ? (
                            <img src={previewUrl} alt="Characters preview" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">Generating…</div>
                        )}
                    </div>
                    <div className="pt-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                onClick={() => setShowCharactersMeta(prev => !prev)}
                                className="w-full"
                            >
                                {showCharactersMeta ? 'Hide Metadata' : '🖋️ Metadata'}
                            </Button>
                            <div className="col-span-2">
                                <ThumbnailUploader
                                    canvasRef={canvasRef}
                                    bgColor="#ffffff"
                                    slug="characters-preview"
                                    layout="grid"
                                />
                            </div>
                        </div>
                        <ThumbnailStudioMetadata
                            slug="characters-preview"
                            showToggle={false}
                            showMeta={showCharactersMeta}
                            className="mt-0 mb-0 space-y-3"
                        />
                    </div>
                </div>
                <Card className="space-y-4 w-full max-w-md">
                    <h5 className="font-semibold mb-2">Settings</h5>
                    <FormItem label="Font Color">
                        <Field name="thumbnailsMetadata.characters_preview_charColor" type="color" component={Input} />
                    </FormItem>
                    <FormItem label="Show Text Area Box">
                        <Field name="thumbnailsMetadata.characters_preview_showTextAreaBox">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="checkbox"
                                    checked={field.value ?? false}
                                    onChange={e => setFieldValue(field.name, e.target.checked)}
                                />
                            )}
                        </Field>
                    </FormItem>
                    <FormItem label="Auto-size Font">
                        <Field name="thumbnailsMetadata.characters_preview_autoFontSize">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="checkbox"
                                    checked={field.value ?? true}
                                    onChange={e => setFieldValue(field.name, e.target.checked)}
                                />
                            )}
                        </Field>
                    </FormItem>
                    <FormItem label="Manual Font Size">
                        <Field name="thumbnailsMetadata.characters_preview_manualFontSize">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="range"
                                    min={50}
                                    max={300}
                                    step={1}
                                    className="w-full"
                                    value={field.value || 100}
                                    disabled={autoFontSize}
                                    onChange={e => setFieldValue(field.name, parseInt(e.target.value))}
                                />
                            )}
                        </Field>
                    </FormItem>
                    <FormItem label="Lines">
                        <Field name="thumbnailsMetadata.characters_preview_charLines" as="select" className="input w-full">
                            <option value={3}>3 lines</option>
                            <option value={4}>4 lines</option>
                            <option value={5}>5 lines</option>
                            <option value={6}>6 lines</option>
                        </Field>
                    </FormItem>
                    <FormItem label="Line Height">
                        <Field name="thumbnailsMetadata.characters_preview_lineHeightRatio">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="range"
                                    min={1.0}
                                    max={2.5}
                                    step={0.05}
                                    className="w-full"
                                    value={field.value || 1.5}
                                    onChange={e => setFieldValue(field.name, parseFloat(e.target.value))}
                                />
                            )}
                        </Field>
                    </FormItem>

                    <FormItem label="Character Sets">
                        <div className="flex flex-wrap gap-4">
                            {['Uppercase', 'Lowercase', 'Numbers', 'Specials'].map((opt, key) => (
                                <label key={key} className="flex items-center space-x-2">
                                    <Field name={`thumbnailsMetadata.characters_preview_show${opt}` as any}>
                                        {({ field }: FieldProps) => (
                                            <input
                                                {...field}
                                                type="checkbox"
                                                checked={field.value ?? true}
                                                onChange={e => setFieldValue(field.name, e.target.checked)}
                                            />
                                        )}
                                    </Field>
                                    <span>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </FormItem>
                    <FormItem label="Vertical Position" className="mb-4">
                        <Field name="thumbnailsMetadata.characters_preview_yOffset">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="range"
                                    min={-200}
                                    max={200}
                                    step={1}
                                    className="w-full"
                                    value={field.value || 0}
                                    onChange={e => setFieldValue(field.name, parseInt(e.target.value))}
                                />
                            )}
                        </Field>
                    </FormItem>
                </Card>
            </div>
        </div>
    )
}

export default ThumbnailStudioThirdCharacters;
