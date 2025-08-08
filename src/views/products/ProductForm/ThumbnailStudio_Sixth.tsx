import { useEffect, useState, useRef, useCallback } from 'react'
import { useFormikContext, Field, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import ThumbnailUploader from './ThumbnailUploader'
import { Product, ThumbnailsMetadata } from '@/@types/product'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Card } from '@/components/ui'
import { Loader2 } from 'lucide-react'

const PADDING = 100
const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 2000

const TEXT_BOX = {
    x1: 1070, y1: 365,   // top-left
    x2: 1740, y2: 740,   // top-right
    x3: 1215, y3: 1650,  // bottom-right
    x4: 595, y4: 1280,  // bottom-left
}

const ThumbnailStudioSixthMockupTablet = ({
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

    const metadata = (values.thumbnailsMetadata || {}) as ThumbnailsMetadata
    const fontColor = metadata.example_tablet_charColor || '#000000'
    const showTextBox = metadata.example_tablet_showTextAreaBox === true
    const xOffset = metadata.example_tablet_xOffset || 0
    const yOffset = metadata.example_tablet_yOffset || 0

    // New metadata fields for manual font size control
    const autoFontSize = metadata.example_tablet_autoFontSize ?? true;
    const manualFontSize = metadata.example_tablet_manualFontSize || 100;

    // Load background image
    useEffect(() => {
        const img = new Image()
        img.src = '/img/others/thumbnail-mockup-tablet.png'
        img.onload = () => setBgImage(img)
    }, [])

    const draw = useCallback(() => {
        // Only draw if both the background image and font are ready.
        if (!bgImage || !isFontReady) {
            return;
        }

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        if (showTextBox) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
            ctx.beginPath()
            ctx.moveTo(TEXT_BOX.x1, TEXT_BOX.y1)
            ctx.lineTo(TEXT_BOX.x2, TEXT_BOX.y2)
            ctx.lineTo(TEXT_BOX.x3, TEXT_BOX.y3)
            ctx.lineTo(TEXT_BOX.x4, TEXT_BOX.y4)
            ctx.closePath()
            ctx.fill()
        }

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = fontColor

        const shortLine = "A"

        // Interpolate line at 50% height
        const t = 0.5
        const lx = TEXT_BOX.x1 + t * (TEXT_BOX.x4 - TEXT_BOX.x1)
        const ly = TEXT_BOX.y1 + t * (TEXT_BOX.y4 - TEXT_BOX.y1)
        const rx = TEXT_BOX.x2 + t * (TEXT_BOX.x3 - TEXT_BOX.x2)
        const ry = TEXT_BOX.y2 + t * (TEXT_BOX.y3 - TEXT_BOX.y2)

        const dx = rx - lx
        const dy = ry - ly
        const length = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / length
        const uy = dy / length
        const px = ux * PADDING
        const py = uy * PADDING

        const startX = lx + px
        const startY = ly + py
        const endX = rx - px
        const endY = ry - py
        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2

        let finalFontSize = manualFontSize;
        if (autoFontSize) {
            // Auto-size font logic
            finalFontSize = 10;
            while (true) {
                ctx.font = `${finalFontSize}px "${productFontFamily}"`
                if (ctx.measureText(shortLine).width > length - 2 * PADDING) break
                finalFontSize++
            }
            finalFontSize--;
        }

        ctx.font = `${finalFontSize}px "${productFontFamily}"`

        ctx.save()
        ctx.translate(midX + xOffset, midY + yOffset)
        ctx.rotate(Math.atan2(endY - startY, endX - startX))
        ctx.fillText(shortLine, 0, 0)
        ctx.restore()

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [metadata, xOffset, yOffset, bgImage, isFontReady, productFontFamily, autoFontSize, manualFontSize])

    useEffect(() => {
        const id = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(id)
    }, [draw])

    return (
        <div className="mt-8">
            <h6 className="font-semibold mb-2">🖼️ Tablet Mockup Thumbnail</h6>
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
                    <div className="pt-2">
                        <ThumbnailStudioMetadata
                            slug="example-tablet"
                        />
                        <ThumbnailUploader
                            canvasRef={canvasRef}
                            bgColor="#ffffff"
                            slug="example-tablet"
                        />
                    </div>
                </div>
                <Card className="space-y-4 w-full max-w-md">
                    <h5 className="font-semibold mb-2">Settings</h5>
                    <FormItem label="Font Color">
                        <Field name="thumbnailsMetadata.example_tablet_charColor" type="color" component={Input} />
                    </FormItem>
                    <FormItem label="Show Text Area Box">
                        <Field name="thumbnailsMetadata.example_tablet_showTextAreaBox">
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
                        <Field name="thumbnailsMetadata.example_tablet_autoFontSize">
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
                        <Field name="thumbnailsMetadata.example_tablet_manualFontSize">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="range"
                                    min={300}
                                    max={1500}
                                    step={1}
                                    className="w-full"
                                    value={field.value || 100}
                                    disabled={autoFontSize}
                                    onChange={e => setFieldValue(field.name, parseInt(e.target.value))}
                                />
                            )}
                        </Field>
                    </FormItem>
                    <FormItem label="X Position (horizontal)" className="mb-4">
                        <Field name="thumbnailsMetadata.example_tablet_xOffset">
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
                    <FormItem label="Y Position (vertical)" className="mb-4">
                        <Field name="thumbnailsMetadata.example_tablet_yOffset">
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

export default ThumbnailStudioSixthMockupTablet;
