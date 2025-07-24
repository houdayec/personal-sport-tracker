import { useEffect, useState, useRef } from 'react'
import { useFormikContext, Field, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import ThumbnailUploader from './ThumbnailUploader'
import { Product, ThumbnailsMetadata } from '@/@types/product'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Card } from '@/components/ui'

const PADDING = 100
const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 2000

const TEXT_BOX2 = {
    x: 500,
    y: 0,
    width: 2000,
    height: 2000,
}

const TEXT_BOX = {
    x1: 1070, y1: 365,   // top-left
    x2: 1740, y2: 740,   // top-right
    x3: 1215, y3: 1650,  // bottom-right
    x4: 595, y4: 1280,  // bottom-left
}

const ThumbnailStudioSixthMockupTablet = () => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const metadata = (values.thumbnailsMetadata || {}) as ThumbnailsMetadata
    const fontColor = metadata.example_tablet_charColor || '#000000'
    const showTextBox = metadata.example_tablet_showTextAreaBox === true

    // Compute character lines
    const paragraph = `Life is a journey best enjoyed with passion, laughter, and the freedom to create. Take time to breathe, explore, and embrace each moment fully. Work hard, rest well, and cherish little things.`;
    const words = paragraph.split(' ')
    const maxWordsPerLine = 5
    const shortLine = "Life is better with creativity."

    let lines: string[] = []
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
        lines.push(words.slice(i, i + maxWordsPerLine).join(' '))
    }

    // Draw text on top of mockup image with transform for natural tilt
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        const bgImage = new Image()
        bgImage.src = '/img/others/thumbnail-mockup-tablet.png'

        bgImage.onload = () => {
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

            // Scale font to fit available width
            let fontSize = 10
            while (true) {
                ctx.font = `${fontSize}px ProductFont, sans-serif`
                if (ctx.measureText(shortLine).width > length - 2 * PADDING) break
                fontSize++
            }
            fontSize--
            ctx.font = `${fontSize}px ProductFont, sans-serif`

            ctx.save()
            ctx.translate(midX, midY)
            ctx.rotate(Math.atan2(endY - startY, endX - startX))
            ctx.fillText(shortLine, 0, 0)
            ctx.restore()

            setPreviewUrl(canvas.toDataURL('image/png'))
        }
    }, [metadata])

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
                        {previewUrl
                            ? <img src={previewUrl} alt="Characters preview" className="w-full h-full object-contain" />
                            : <div className="w-full h-full flex items-center justify-center">Generating…</div>
                        }
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
                </Card>
            </div>
        </div>
    )
}

export default ThumbnailStudioSixthMockupTablet
