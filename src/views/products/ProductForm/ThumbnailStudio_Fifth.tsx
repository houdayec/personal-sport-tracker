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
    x1: 660, y1: 485,   // top-left
    x2: 1920, y2: 420,   // top-right
    x3: 2025, y3: 1225,  // bottom-right
    x4: 750, y4: 1345,  // bottom-left
}

const ThumbnailStudioFifthMockupLaptop = ({
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
    // The font-ready state and its useEffect have been removed.
    // The component now relies on the isFontReady prop from the parent.

    const metadata = (values.thumbnailsMetadata || {}) as ThumbnailsMetadata
    const fontColor = metadata.example_laptop_charColor || '#000000'
    const showTextBox = metadata.example_laptop_showTextAreaBox === true

    // Load background image
    useEffect(() => {
        const img = new Image()
        img.src = '/img/others/thumbnail-mockup-computer.png'
        img.onload = () => setBgImage(img)
    }, [])

    const draw = useCallback(() => {
        // Only draw if both the background image and font are ready
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

        const casing = metadata.example_laptop_casing || 'default'

        const rawLines = ["Life is better", "with creativity."]
        const lines = rawLines.map(line => {
            switch (casing) {
                case 'lower': return line.toLowerCase()
                case 'upper': return line.toUpperCase()
                case 'title':
                    return line.split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        .join(' ')
                default: return line
            }
        })

        const tTop = 1 / 3
        const tBottom = 2 / 3

        const lx1 = TEXT_BOX.x1 + tTop * (TEXT_BOX.x4 - TEXT_BOX.x1)
        const ly1 = TEXT_BOX.y1 + tTop * (TEXT_BOX.y4 - TEXT_BOX.y1)
        const rx1 = TEXT_BOX.x2 + tTop * (TEXT_BOX.x3 - TEXT_BOX.x2)
        const ry1 = TEXT_BOX.y2 + tTop * (TEXT_BOX.y3 - TEXT_BOX.y2)

        const lx2 = TEXT_BOX.x1 + tBottom * (TEXT_BOX.x4 - TEXT_BOX.x1)
        const ly2 = TEXT_BOX.y1 + tBottom * (TEXT_BOX.y4 - TEXT_BOX.y1)
        const rx2 = TEXT_BOX.x2 + tBottom * (TEXT_BOX.x3 - TEXT_BOX.x2)
        const ry2 = TEXT_BOX.y2 + tBottom * (TEXT_BOX.y3 - TEXT_BOX.y2)

        const dist1 = Math.sqrt((rx1 - lx1) ** 2 + (ry1 - ly1) ** 2)
        const dist2 = Math.sqrt((rx2 - lx2) ** 2 + (ry2 - ly2) ** 2)
        const minLength = Math.min(dist1, dist2) - 2 * PADDING

        let fontSize = 10
        while (true) {
            ctx.font = `${fontSize}px "${productFontFamily}", sans-serif`
            const widths = lines.map(l => ctx.measureText(l).width)
            if (Math.max(...widths) > minLength) break
            fontSize++
        }
        fontSize--
        ctx.font = `${fontSize}px "${productFontFamily}", sans-serif`

        const lineHeight = fontSize * 1.3
        const pairs = [[lx1, ly1, rx1, ry1], [lx2, ly2, rx2, ry2]]

        lines.forEach((line, i) => {
            const [lx, ly, rx, ry] = pairs[i]
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

            ctx.save()
            ctx.translate(midX, midY)
            ctx.rotate(Math.atan2(endY - startY, endX - startX))
            ctx.fillText(line, 0, 0)
            ctx.restore()
        })

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [metadata, bgImage, isFontReady, productFontFamily])

    useEffect(() => {
        const id = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(id)
    }, [draw])

    return (
        <div className="mt-8">
            <h6 className="font-semibold mb-2">🖼️ Laptop Mockup Thumbnail</h6>
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{ display: 'none' }}
            />
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:max-w-md flex-shrink-0">
                    <div className="border rounded bg-white overflow-hidden max-w-xl w-full aspect-[3/2]">
                        {/* Conditional rendering now uses isFontReady prop */}
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
                        <ThumbnailStudioMetadata slug="example-laptop" />
                        <ThumbnailUploader
                            canvasRef={canvasRef}
                            bgColor="#ffffff"
                            slug="example-laptop"
                        />
                    </div>
                </div>
                <Card className="space-y-4 w-full max-w-md">
                    <h5 className="font-semibold mb-2">Settings</h5>
                    <FormItem label="Font Color">
                        <Field name="thumbnailsMetadata.example_laptop_charColor" type="color" component={Input} />
                    </FormItem>
                    <FormItem label="Casing Style">
                        <Field name="thumbnailsMetadata.example_laptop_casing" as="select" className="w-full border rounded px-3 py-2">
                            <option value="default">Life is better</option>
                            <option value="lower">life is better</option>
                            <option value="title">Life Is Better</option>
                            <option value="upper">LIFE IS BETTER</option>
                        </Field>
                    </FormItem>
                    <FormItem label="Show Text Area Box">
                        <Field name="thumbnailsMetadata.example_laptop_showTextAreaBox">
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
                </Card>
            </div>
        </div>
    )
}

export default ThumbnailStudioFifthMockupLaptop;
