import { useEffect, useRef, useState } from 'react'
import { useFormikContext } from 'formik'
import ThumbnailUploader from './ThumbnailUploader'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Product } from '@/@types/product'

const FILES_SRC = '/img/others/thumbnail-files.png'
const COMPAT_SRC = '/img/others/thumbnail-compatibility.png'
const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 2000

const ThumbnailStudio_IncludedFilesAndCompatibility = () => {
    const { values } = useFormikContext<Product>()
    const filesCanvasRef = useRef<HTMLCanvasElement>(null)
    const compatCanvasRef = useRef<HTMLCanvasElement>(null)
    const [filesImage, setFilesImage] = useState<HTMLImageElement | null>(null)
    const [compatImage, setCompatImage] = useState<HTMLImageElement | null>(null)
    const [filesPreview, setFilesPreview] = useState<string | null>(null)
    const [compatPreview, setCompatPreview] = useState<string | null>(null)

    useEffect(() => {
        const img1 = new Image()
        const img2 = new Image()
        img1.src = FILES_SRC
        img2.src = COMPAT_SRC
        img1.onload = () => setFilesImage(img1)
        img2.onload = () => setCompatImage(img2)
    }, [])

    useEffect(() => {
        if (filesImage && filesCanvasRef.current) {
            const ctx = filesCanvasRef.current.getContext('2d')!
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            ctx.drawImage(filesImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            setFilesPreview(filesCanvasRef.current.toDataURL('image/png'))
        }
        if (compatImage && compatCanvasRef.current) {
            const ctx = compatCanvasRef.current.getContext('2d')!
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            ctx.drawImage(compatImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            setCompatPreview(compatCanvasRef.current.toDataURL('image/png'))
        }
    }, [filesImage, compatImage])

    return (
        <div className="mt-8 space-y-12">
            <h6 className="font-semibold text-lg">📁 Included Files & Compatibility</h6>

            {/* Included Files */}
            <div>
                <h5 className="font-semibold mb-2">Included Files</h5>
                <canvas ref={filesCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'none' }} />
                <div className="border rounded bg-white overflow-hidden max-w-xl w-full aspect-[3/2]">
                    {filesPreview
                        ? <img src={filesPreview} alt="Included files preview" className="w-full h-full object-contain" />
                        : <div className="w-full h-full flex items-center justify-center">Generating…</div>}
                </div>
                <div className="pt-2">
                    <ThumbnailStudioMetadata slug="included-files" />
                    <ThumbnailUploader canvasRef={filesCanvasRef} bgColor="#ffffff" slug="included-files" />
                </div>
            </div>

            {/* Compatibility */}
            <div>
                <h5 className="font-semibold mb-2">Compatibility</h5>
                <canvas ref={compatCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'none' }} />
                <div className="border rounded bg-white overflow-hidden max-w-xl w-full aspect-[3/2]">
                    {compatPreview
                        ? <img src={compatPreview} alt="Compatibility preview" className="w-full h-full object-contain" />
                        : <div className="w-full h-full flex items-center justify-center">Generating…</div>}
                </div>
                <div className="pt-2">
                    <ThumbnailStudioMetadata slug="compatibility" />
                    <ThumbnailUploader canvasRef={compatCanvasRef} bgColor="#ffffff" slug="compatibility" />
                </div>
            </div>
        </div>
    )
}

export default ThumbnailStudio_IncludedFilesAndCompatibility
