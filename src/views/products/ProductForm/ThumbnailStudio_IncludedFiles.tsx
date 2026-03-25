import { useEffect, useRef, useState } from 'react'
import { useFormikContext } from 'formik'
import ThumbnailUploader from './ThumbnailUploader'
import ThumbnailStudioMetadata from './ThumbnailStudioMetadata'
import { Product } from '@/@types/product'
import { Button } from '@/components/ui'

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
    const [showIncludedMeta, setShowIncludedMeta] = useState(false)
    const [showCompatMeta, setShowCompatMeta] = useState(false)

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
        <div className="mt-8 space-y-6">
            <h6 className="font-semibold text-lg mb-4">📁 Included Files & Compatibility</h6>
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1 max-w-md">
                    <h5 className="font-semibold mb-2">Included Files</h5>
                    <canvas ref={filesCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'none' }} />
                    <div className="border rounded bg-white overflow-hidden aspect-[3/2] w-full">
                        {filesPreview
                            ? <img src={filesPreview} alt="Included files preview" className="w-full h-full object-contain" />
                            : <div className="w-full h-full flex items-center justify-center">Generating…</div>}
                    </div>
                    <div className="pt-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                onClick={() => setShowIncludedMeta(prev => !prev)}
                                className="w-full"
                            >
                                {showIncludedMeta ? 'Hide Metadata' : '🖋️ Metadata'}
                            </Button>
                            <div className="col-span-2">
                                <ThumbnailUploader
                                    canvasRef={filesCanvasRef}
                                    bgColor="#ffffff"
                                    slug="included-files"
                                    layout="grid"
                                />
                            </div>
                        </div>
                        <ThumbnailStudioMetadata
                            slug="included-files"
                            showToggle={false}
                            showMeta={showIncludedMeta}
                            className="mt-0 mb-0 space-y-3"
                        />
                    </div>
                </div>

                <div className="flex-1 max-w-md">
                    <h5 className="font-semibold mb-2">Compatibility</h5>
                    <canvas ref={compatCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'none' }} />
                    <div className="border rounded bg-white overflow-hidden aspect-[3/2] w-full">
                        {compatPreview
                            ? <img src={compatPreview} alt="Compatibility preview" className="w-full h-full object-contain" />
                            : <div className="w-full h-full flex items-center justify-center">Generating…</div>}
                    </div>
                    <div className="pt-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                onClick={() => setShowCompatMeta(prev => !prev)}
                                className="w-full"
                            >
                                {showCompatMeta ? 'Hide Metadata' : '🖋️ Metadata'}
                            </Button>
                            <div className="col-span-2">
                                <ThumbnailUploader
                                    canvasRef={compatCanvasRef}
                                    bgColor="#ffffff"
                                    slug="compatibility"
                                    layout="grid"
                                />
                            </div>
                        </div>
                        <ThumbnailStudioMetadata
                            slug="compatibility"
                            showToggle={false}
                            showMeta={showCompatMeta}
                            className="mt-0 mb-0 space-y-3"
                        />
                    </div>
                </div>
            </div>

        </div>
    )

}

export default ThumbnailStudio_IncludedFilesAndCompatibility
