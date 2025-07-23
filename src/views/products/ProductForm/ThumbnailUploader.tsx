import { useFormikContext } from 'formik'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Radio from '@/components/ui/Radio'
import { Product } from '@/@types/product'
import { toast, Notification } from '@/components/ui'
import { storage } from '@/firebase'
import { ref, uploadBytes } from 'firebase/storage'
import { useState, RefObject } from 'react'

type Props = {
    canvasRef: RefObject<HTMLCanvasElement | null>
    bgColor: string
    slug: string
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
    new Promise(resolve => canvas.toBlob(blob => resolve(blob!), type, quality))

// Crop square canvas from landscape source
const cropSquareFromCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const size = canvas.height
    const cropped = document.createElement('canvas')
    cropped.width = size
    cropped.height = size
    const ctx = cropped.getContext('2d')!
    ctx.drawImage(canvas, (canvas.width - size) / 2, 0, size, size, 0, 0, size, size)
    return cropped
}

const ThumbnailUploader = ({ canvasRef, bgColor, slug }: Props) => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const [isUploading, setIsUploading] = useState(false)
    const [thumbnails, setThumbnails] = useState<Blob[]>([])
    const [previewData, setPreviewData] = useState<{
        format: 'png' | 'jpg' | 'webp'
        images: {
            type: 'square' | 'landscape'
            url: string
            size: number
            format: 'png' | 'jpg' | 'webp'
        }[]
    } | null>(null)
    const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpg' | 'webp'>('webp')
    const [selectedAspect, setSelectedAspect] = useState<'square' | 'landscape'>('square')

    const sku = values.sku
    const main = values.mainKeyword?.toLowerCase?.() || 'main'
    const second = values.secondKeyword?.toLowerCase?.() || 'second'
    const filename = `${main}-font-${second}-font-${slug}`

    // Generate square & landscape image versions
    const generateThumbnails = async () => {
        if (!canvasRef.current) return

        const originalCanvas = canvasRef.current
        const squareSize = originalCanvas.height
        const landscapeWidth = Math.floor((3 / 2) * squareSize)

        // Generate square thumbnail
        const squareCanvas = document.createElement('canvas')
        squareCanvas.width = squareSize
        squareCanvas.height = squareSize
        squareCanvas
            .getContext('2d')!
            .drawImage(originalCanvas, (originalCanvas.width - squareSize) / 2, 0, squareSize, squareSize, 0, 0, squareSize, squareSize)

        // Generate landscape thumbnail with same height
        const landscapeCanvas = document.createElement('canvas')
        landscapeCanvas.width = landscapeWidth
        landscapeCanvas.height = squareSize
        landscapeCanvas
            .getContext('2d')!
            .drawImage(originalCanvas, (originalCanvas.width - landscapeWidth) / 2, 0, landscapeWidth, squareSize, 0, 0, landscapeWidth, squareSize)

        const generate = async (canvas: HTMLCanvasElement) => ({
            png: await canvasToBlob(canvas, 'image/png'),
            jpg: await canvasToBlob(canvas, 'image/jpeg', 0.8),
            webp: await canvasToBlob(canvas, 'image/webp', 0.7),
        })

        const squareBlobs = await generate(squareCanvas)
        const landscapeBlobs = await generate(landscapeCanvas)

        const images = [
            { type: 'square', format: 'png', blob: squareBlobs.png },
            { type: 'square', format: 'jpg', blob: squareBlobs.jpg },
            { type: 'square', format: 'webp', blob: squareBlobs.webp },
            { type: 'landscape', format: 'png', blob: landscapeBlobs.png },
            { type: 'landscape', format: 'jpg', blob: landscapeBlobs.jpg },
            { type: 'landscape', format: 'webp', blob: landscapeBlobs.webp },
        ]

        setThumbnails(images.map(i => i.blob))
        setPreviewData({
            format: 'webp',
            images: images.map(i => ({
                type: i.type as 'square' | 'landscape',
                format: i.format as 'png' | 'jpg' | 'webp',
                url: URL.createObjectURL(i.blob),
                size: i.blob.size,
            })),
        })

        toast.push(
            <Notification title="Thumbnails Ready" type="success" duration={2500}>
                {images.length} versions generated
            </Notification>,
            { placement: 'top-center' }
        )
    }

    // Upload only JPG & WEBP versions to Firebase
    const handleUpload = async () => {
        if (!thumbnails.length || !sku) return
        setIsUploading(true)
        const basePath = `products/${sku}/files/thumbnails`

        const [
            , squareJpg, squareWebp,
            , landscapeJpg, landscapeWebp
        ] = thumbnails

        await Promise.all([
            uploadBytes(ref(storage, `${basePath}/square/${filename}-square.jpg`), squareJpg),
            uploadBytes(ref(storage, `${basePath}/square/${filename}-square.webp`), squareWebp),
            uploadBytes(ref(storage, `${basePath}/3_2/${filename}-landscape.jpg`), landscapeJpg),
            uploadBytes(ref(storage, `${basePath}/3_2/${filename}-landscape.webp`), landscapeWebp),
        ])

        setFieldValue(`thumbnails.${slug}.generated`, true)
        console.log('Thumbnails uploaded:', sku, filename)
        toast.push(
            <Notification title="Thumbnails Uploaded" type="success" duration={2500}>
                {filename} in JPG & WEBP formats
            </Notification>,
            { placement: 'top-center' }
        )
        setIsUploading(false)
    }

    return (
        <div className="w-full">
            <div className="space-y-2">
                <Button onClick={generateThumbnails} className="w-full" type='button'>
                    ⚙️ Generate
                </Button>
                <Button
                    onClick={handleUpload}
                    type="button"
                    variant="twoTone"
                    disabled={isUploading || !thumbnails.length}
                    className="w-full"
                >
                    {isUploading ? (
                        <div className="flex items-center justify-center gap-2 w-full">
                            <Spinner size={16} />
                            Uploading…
                        </div>
                    ) : (
                        <>📤 Upload</>
                    )}
                </Button>
                {previewData && (
                    <>
                        <div>
                            <label className="block mb-1 font-semibold">Format</label>
                            <Radio.Group value={selectedFormat} onChange={val => setSelectedFormat(val as any)} className="flex gap-4">
                                <Radio value="png">PNG</Radio>
                                <Radio value="jpg">JPG</Radio>
                                <Radio value="webp">WEBP</Radio>
                            </Radio.Group>
                        </div>

                        <div>
                            <label className="block mb-1 font-semibold">Aspect Ratio</label>
                            <Radio.Group value={selectedAspect} onChange={val => setSelectedAspect(val as any)} className="flex gap-4">
                                <Radio value="square">Square</Radio>
                                <Radio value="landscape">Landscape</Radio>
                            </Radio.Group>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            {previewData.images
                                .filter(img => img.format === selectedFormat && img.type === selectedAspect)
                                .map((img, idx) => (
                                    <div key={idx} className="text-center">
                                        <img src={img.url} className="w-full max-w-full border rounded object-contain" alt={img.type} />
                                        <div className="text-sm mt-1">
                                            {img.type} – {(img.size / 1024).toFixed(1)} KB
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default ThumbnailUploader
