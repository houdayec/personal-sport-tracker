import { useEffect, useState, useRef } from 'react'
import { useFormikContext, Field, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import ThumbnailUploader from './ThumbnailUploader'
import { Product } from '@/@types/product'

const IMAGE_SRC = '/img/others/thumbnail-preview.png'
const CANVAS_WIDTH = 1600
const CANVAS_HEIGHT = 1200

// Rectangle bounds to draw text (tweak this to position properly)
const TEXT_BOX = {
    x: 345,
    y: 395,
    width: 910,
    height: 580,
}

type ThumbnailsMetadata = {
    charColor?: string
    showTextAreaBox?: boolean
    // Add other fields you plan to use
}
const ThumbnailStudioSecondSentence = () => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const metadata = values.thumbnailsMetadata || {}
    const fontColor = '#000000'
    const fontSize = 80
    const showTextBox = true
    useEffect(() => {
        const img = new Image()
        img.src = IMAGE_SRC
        img.onload = () => setBgImage(img)
    }, [])

    useEffect(() => {
        if (!bgImage) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        if (showTextBox) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
            ctx.fillRect(TEXT_BOX.x, TEXT_BOX.y, TEXT_BOX.width, TEXT_BOX.height)
        }

        const padding = 50
        const paddedBox = {
            x: TEXT_BOX.x + padding,
            y: TEXT_BOX.y + padding,
            width: TEXT_BOX.width - 2 * padding,
            height: TEXT_BOX.height - 2 * padding,
        }

        const lines = [
            'The Quick Brown',
            'Fox Jumps Over',
            'The Lazy Dog',
        ]

        // Capitalize all words
        const capitalizedLines = lines.map(line =>
            line.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        )

        // Dynamically fit font size
        let testFontSize = 10
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        let fits = false

        while (!fits) {
            ctx.font = `${testFontSize}px ProductFont, sans-serif`
            const heights = testFontSize * 1.2 * lines.length
            const widths = capitalizedLines.map(line => ctx.measureText(line).width)
            const maxWidth = Math.max(...widths)
            if (heights > paddedBox.height || maxWidth > paddedBox.width) break
            testFontSize += 1
        }
        testFontSize -= 1

        ctx.font = `${testFontSize}px ProductFont, sans-serif`
        ctx.fillStyle = fontColor

        const lineHeight = testFontSize * 1.2
        const totalHeight = capitalizedLines.length * lineHeight
        const startY = paddedBox.y + (paddedBox.height - totalHeight) / 2 + lineHeight / 2

        capitalizedLines.forEach((line, i) => {
            const y = startY + i * lineHeight
            ctx.fillText(line, paddedBox.x + paddedBox.width / 2, y)
        })

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [bgImage, fontColor, showTextBox])

    return (
        <div className="mt-8">
            <h6 className="font-semibold mb-2">🖼️ Sentence Thumbnail</h6>
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{ display: 'none' }}
            />
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="border rounded bg-white overflow-hidden max-w-xl w-full aspect-[4/3]">
                    {previewUrl
                        ? <img src={previewUrl} alt="Sentence preview" className="w-full h-full object-contain" />
                        : <div className="w-full h-full flex items-center justify-center">Generating…</div>
                    }
                </div>
                <div className="space-y-4 w-full max-w-md">
                    <FormItem label="Font Color">
                        <Field name="thumbnailsMetadata.charColor" type="color" component={Input} />
                    </FormItem>
                    <FormItem label="Show Text Area Box">
                        <Field name="thumbnailsMetadata.showTextAreaBox">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={e => setFieldValue(field.name, e.target.checked)}
                                />
                            )}
                        </Field>
                    </FormItem>
                    <ThumbnailUploader
                        canvasRef={canvasRef}
                        bgColor="#ffffff"
                        slug="sentence"
                    />
                </div>
            </div>
        </div>
    )
}

export default ThumbnailStudioSecondSentence
