import { useEffect, useState, useRef } from 'react'
import { useFormikContext, Field, FieldProps } from 'formik'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import ThumbnailUploader from './ThumbnailUploader'
import { Product, ThumbnailsMetadata } from '@/@types/product'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Card } from '@/components/ui'

const IMAGE_SRC = '/img/others/thumbnail-preview.png'
const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 2000

const TEXT_BOX = {
    x: 645,
    y: 660,
    width: 1710,
    height: 960,
}

const ThumbnailStudio_Sentence = () => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const metadata = (values.thumbnailsMetadata || {}) as ThumbnailsMetadata
    const fontColor = metadata.sentence_charColor || '#000000'
    const showTextBox = metadata.sentence_showTextAreaBox === true

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
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        if (showTextBox) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
            ctx.fillRect(TEXT_BOX.x, TEXT_BOX.y, TEXT_BOX.width, TEXT_BOX.height)
        }

        const padding = 80
        const paddedBox = {
            x: TEXT_BOX.x + padding,
            y: TEXT_BOX.y + padding,
            width: TEXT_BOX.width - 2 * padding,
            height: TEXT_BOX.height - 2 * padding,
        }

        const casing = (metadata.sentence_case || 'title') as 'title' | 'lower' | 'upper'

        const lines = [
            'The Quick Brown',
            'Fox Jumps Over',
            'The Lazy Dog',
        ].map(line => {
            switch (casing) {
                case 'lower': return line.toLowerCase()
                case 'upper': return line.toUpperCase()
                default:
                    return line.split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        .join(' ')
            }
        })

        let testFontSize = 10
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        while (true) {
            ctx.font = `${testFontSize}px ProductFont, sans-serif`
            const heights = testFontSize * 1.2 * lines.length
            const widths = lines.map(line => ctx.measureText(line).width)
            const maxWidth = Math.max(...widths)
            if (heights > paddedBox.height || maxWidth > paddedBox.width) break
            testFontSize += 1
        }
        testFontSize -= 1

        ctx.font = `${testFontSize}px ProductFont, sans-serif`
        ctx.fillStyle = fontColor

        const lineHeight = testFontSize * 1.2
        const totalHeight = lines.length * lineHeight
        const startY = paddedBox.y + (paddedBox.height - totalHeight) / 2 + lineHeight / 2

        lines.forEach((line, i) => {
            const y = startY + i * lineHeight
            ctx.fillText(line, paddedBox.x + paddedBox.width / 2, y)
        })

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [bgImage, metadata])

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
                <div className="w-full md:max-w-md flex-shrink-0">

                    <div className="border rounded bg-white overflow-hidden max-w-xl w-full aspect-[3/2]">
                        {previewUrl
                            ? <img src={previewUrl} alt="Sentence preview" className="w-full h-full object-contain" />
                            : <div className="w-full h-full flex items-center justify-center">Generating…</div>
                        }
                    </div>
                    <div className="pt-2">
                        <ThumbnailStudioMetadata slug="sentence" />
                        <ThumbnailUploader
                            canvasRef={canvasRef}
                            bgColor="#ffffff"
                            slug="sentence"
                        />
                    </div>
                </div>
                <Card className="space-y-4 w-full max-w-md">
                    <h5 className="font-semibold mb-2">Settings</h5>
                    <FormItem label="Font Color">
                        <Field name="thumbnailsMetadata.sentence_charColor" type="color" component={Input} />
                    </FormItem>
                    <FormItem label="Sentence Casing">
                        <Field as="select" name="thumbnailsMetadata.sentence_case" className="input w-full">
                            <option value="title">The Quick Brown</option>
                            <option value="lower">the quick brown</option>
                            <option value="upper">THE QUICK BROWN</option>
                        </Field>
                    </FormItem>
                    <FormItem label="Show Text Area Box">
                        <Field name="thumbnailsMetadata.sentence_showTextAreaBox">
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
                </Card>
            </div>
        </div>
    )
}

export default ThumbnailStudio_Sentence
