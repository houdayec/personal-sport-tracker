import { useEffect, useState, useRef } from 'react'
import { useFormikContext, Field, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import ThumbnailUploader from './ThumbnailUploader'
import { Product, ThumbnailsMetadata } from '@/@types/product'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'

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
    x1: 660, y1: 485,   // top-left
    x2: 1920, y2: 420,   // top-right
    x3: 2025, y3: 1225,  // bottom-right
    x4: 750, y4: 1345,  // bottom-left
}


const ThumbnailStudioFifthMockupLaptop = () => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const metadata = (values.thumbnailsMetadata || {}) as ThumbnailsMetadata
    const fontColor = metadata.example_laptop_charColor || '#000000'
    const showTextBox = metadata.example_laptop_showTextAreaBox === true

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
        bgImage.src = '/img/others/thumbnail-mockup-computer.png'

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

            const lines = ["Life is better", "with creativity."]

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

            // Determine max font size that fits both lines
            let fontSize = 10
            while (true) {
                ctx.font = `${fontSize}px ProductFont, sans-serif`
                const widths = lines.map(l => ctx.measureText(l).width)
                if (Math.max(...widths) > minLength) break
                fontSize++
            }
            fontSize--
            ctx.font = `${fontSize}px ProductFont, sans-serif`

            // Draw each line with rotation
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
                        <ThumbnailStudioMetadata slug="example_laptop" />
                        <ThumbnailUploader
                            canvasRef={canvasRef}
                            bgColor="#ffffff"
                            slug="example-laptop"
                        />
                    </div>
                </div>
                <div className="space-y-4 w-full max-w-md">
                    <FormItem label="Font Color">
                        <Field name="thumbnailsMetadata.example_laptop_charColor" type="color" component={Input} />
                    </FormItem>
                    <FormItem label="Show Text Area Box">
                        <Field name="thumbnailsMetadata.example_laptop_showTextAreaBox">
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
                </div>
            </div>
        </div>
    )
}

export default ThumbnailStudioFifthMockupLaptop
