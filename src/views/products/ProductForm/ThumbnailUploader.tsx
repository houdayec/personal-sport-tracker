import { useFormikContext } from 'formik'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
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

const createThreeTwoFromSquare = async (squareBlob: Blob, bgColor: string): Promise<HTMLCanvasElement> => {
    const img = await createImageBitmap(squareBlob)
    const canvas = document.createElement('canvas')
    canvas.width = 3000
    canvas.height = 2000
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 500, 0)
    return canvas
}

const upload = async (path: string, blob: Blob) => {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, blob)
}

const ThumbnailUploader = ({ canvasRef, bgColor, slug }: Props) => {
    const { values } = useFormikContext<Product>()
    const [isUploading, setIsUploading] = useState(false)
    const [thumbs, setThumbs] = useState<Record<string, Blob> | null>(null)

    const sku = values.sku
    const fontMeta = values.fontData as any
    const main = values.mainKeyword?.toLowerCase?.() || 'main'
    const second = values.secondKeyword?.toLowerCase?.() || 'second'
    const filename = `${main}-font-${second}-font-${slug}`
    const basePath = `products/${sku}/files/thumbnails`
    const [thumbnails, setThumbnails] = useState<Blob[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
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

    // Generate blobs from canvas, log size
    const generateThumbnails = async () => {
        if (!canvasRef.current) return
        setIsGenerating(true)

        const squareCanvas = canvasRef.current
        const squarePng = await canvasToBlob(squareCanvas, 'image/png')
        const squareJpg = await canvasToBlob(squareCanvas, 'image/jpeg', 0.8)
        const squareWebp = await canvasToBlob(squareCanvas, 'image/webp', 0.7)

        const ratioCanvas = await createThreeTwoFromSquare(squarePng, bgColor)
        const ratioPng = await canvasToBlob(ratioCanvas, 'image/png')
        const ratioJpg = await canvasToBlob(ratioCanvas, 'image/jpeg', 0.8)
        const ratioWebp = await canvasToBlob(ratioCanvas, 'image/webp', 0.7)

        const blobs = [squarePng, squareJpg, squareWebp, ratioPng, ratioJpg, ratioWebp]
        setThumbnails(blobs)

        blobs.forEach((blob, i) => {
            const sizeKB = (blob.size / 1024).toFixed(1)
            console.log(`Generated ${i + 1}/${blobs.length} - ${sizeKB} KB`)
        })

        toast.push(
            <Notification title="Thumbnails Ready" type="success" duration={2500}>
                {blobs.length} versions generated
            </Notification>,
            { placement: 'top-center' }
        )
        setIsGenerating(false)

        setPreviewData({
            format: 'webp',
            images: [
                { type: 'square', url: URL.createObjectURL(squarePng), size: squarePng.size, format: 'png' },
                { type: 'landscape', url: URL.createObjectURL(ratioPng), size: ratioPng.size, format: 'png' },
                { type: 'square', url: URL.createObjectURL(squareJpg), size: squareJpg.size, format: 'jpg' },
                { type: 'landscape', url: URL.createObjectURL(ratioJpg), size: ratioJpg.size, format: 'jpg' },
                { type: 'square', url: URL.createObjectURL(squareWebp), size: squareWebp.size, format: 'webp' },
                { type: 'landscape', url: URL.createObjectURL(ratioWebp), size: ratioWebp.size, format: 'webp' },
            ],
        })

    }

    // Upload blobs to firebase
    const handleUpload = async () => {
        if (!canvasRef.current || !sku || !main || !second || thumbnails.length < 6) return
        setIsUploading(true)

        const filename = `${main}-font-${second}-font-${slug}`
        const basePath = `products/${sku}/files/thumbnails`

        const [
            squarePng, squareJpg, squareWebp,
            ratioPng, ratioJpg, ratioWebp
        ] = thumbnails

        //await upload(`${basePath}/square/${filename}-square.png`, squarePng)
        await upload(`${basePath}/square/${filename}-square.jpg`, squareJpg)
        await upload(`${basePath}/square/${filename}-square.webp`, squareWebp)

        //await upload(`${basePath}/3_2/${filename}-landscape32.png`, ratioPng)
        await upload(`${basePath}/3_2/${filename}-landscape32.jpg`, ratioJpg)
        await upload(`${basePath}/3_2/${filename}-landscape32.webp`, ratioWebp)

        toast.push(
            <Notification title="Thumbnails Uploaded" type="success" duration={2500}>
                {filename} in PNG, JPG & WebP formats
            </Notification>,
            { placement: 'top-center' }
        )
        setIsUploading(false)
    }

    return (
        <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={generateThumbnails} type="button" variant="solid">
                ⚙️ Generate Thumbnails
            </Button>

            {previewData && (
                <div className="mt-6 mb-6">
                    <div className="flex gap-2 mb-2">
                        {['png', 'jpg', 'webp'].map(fmt => (
                            <Button
                                key={fmt}
                                type='button'
                                className={`px-2 py-1 text-sm border rounded ${selectedFormat === fmt ? 'bg-blue-600 text-black' : 'bg-white text-gray-700'}`}
                                onClick={() => setSelectedFormat(fmt as any)}
                            >
                                {fmt.toUpperCase()}
                            </Button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {previewData.images
                            .filter(img => img.format === selectedFormat)
                            .map((img, idx) => (
                                <div key={idx} className="text-center">
                                    <img src={img.url} alt={img.type} className="w-full border rounded" />
                                    <div className="text-sm mt-1">
                                        {img.type} – {(img.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            <Button onClick={handleUpload} type="button" variant="solid" disabled={isUploading || !thumbnails.length}>
                {isUploading ? (
                    <div className="flex items-center gap-2">
                        <Spinner size={16} /> Uploading…
                    </div>
                ) : (
                    <>📤 Upload Thumbnails</>
                )}
            </Button>

        </div>
    )
}

export default ThumbnailUploader
