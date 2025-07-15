// Required: set up firebase.ts with your config
import { storage } from '@/firebase'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { useEffect, useState } from 'react'
import opentype from 'opentype.js'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import AdaptableCard from '@/components/shared/AdaptableCard'
import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Field, useFormikContext } from 'formik'

const AssetsFields = () => {
    const { values } = useFormikContext<any>()
    const [ttfFile, setTtfFile] = useState<File | null>(null)
    const [font, setFont] = useState<opentype.Font | null>(null)
    const [glyphCount, setGlyphCount] = useState(0)
    const [previewSvg, setPreviewSvg] = useState<string | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

    const handleTtfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setTtfFile(file)
        const arrayBuffer = await file.arrayBuffer()
        const parsedFont = opentype.parse(arrayBuffer)
        setFont(parsedFont)
        setGlyphCount(parsedFont.glyphs.length)
        generatePreviewSVG(parsedFont)
    }

    const applyMetadata = () => {
        if (!font) return
        const { fontFamily, fullName, version } = values.fontData.generated
        font.names = {} as any
        font.names.fontFamily = { en: fontFamily }
        font.names.fullName = { en: fullName }
        font.names.fontSubfamily = { en: 'Regular' }
        font.names.postScriptName = { en: fullName.replace(/\s+/g, '') }
        font.names.version = { en: version || '1.0' }
        font.names.designer = { en: 'FontMaze' }
        font.names.manufacturer = { en: 'FontMaze' }
        font.names.copyright = { en: 'All rights reserved to FontMaze' }
        font.names.description = { en: `${fullName} designed by FontMaze Studio` }
        font.names.license = { en: 'Personal Use Only. Purchase a commercial license to use it commercially.' }
        font.names.licenseURL = { en: 'https://www.fontmaze.com/licenses/font-license/' }
        font.names.trademark = { en: 'FontMaze' }
            ; (font.names as any).sampleText = {
                en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789',
            }

        // Hidden glyph with FontMaze signature SVG at unicode 0xE000 (PUA start)
        const path = new opentype.Path()
        path.moveTo(0, 0)
        path.lineTo(500, 0)
        path.lineTo(500, 500)
        path.lineTo(0, 500)
        path.close()
        const trademarkGlyph = new opentype.Glyph({
            name: 'hidden_trademark',
            unicode: 0xE000,
            advanceWidth: 600,
            path: path
        })
        const glyph = font.charToGlyph(String.fromCharCode(0xE000))

        if (glyph) {
            const path = new opentype.Path()
            path.moveTo(0, 0)
            path.lineTo(300, 0)
            path.lineTo(300, 300)
            path.lineTo(0, 300)
            path.close()

            glyph.path = path
            glyph.advanceWidth = 600
            glyph.name = 'hidden_trademark'
        }
    }

    const generatePreviewSVG = (font: opentype.Font) => {
        const lines = [
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'abcdefghijklmnopqrstuvwxyz',
            '0123456789!@#$%^&*()[]{}<>.,;:"'
        ]

        const fontSize = 32
        const lineHeight = 60
        const padding = 20
        const charsPerLine = lines[0].length
        const width = charsPerLine * 36 + padding * 2
        const height = lines.length * lineHeight + padding * 2

        const svgPaths = lines.map((line, row) => {
            return line.split('').map((char, i) => {
                const glyph = font.charToGlyph(char)
                const path = glyph.getPath(padding + i * 36, padding + (row + 1) * lineHeight - 10, fontSize)
                return path.toSVG(3)
            }).join('')
        }).join('')

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#fff" />
  <g fill="black">${svgPaths}</g>
</svg>
        `.trim()

        setPreviewSvg(svg)
    }

    const uploadWithProgress = (path: string, file: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const storageRef = ref(storage, path)
            const uploadTask = uploadBytesResumable(storageRef, file)
            setIsUploading(true)

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    setUploadProgress(Math.round(progress))
                },
                (error) => {
                    setIsUploading(false)
                    reject(error)
                },
                async () => {
                    setIsUploading(false)
                    const url = await getDownloadURL(uploadTask.snapshot.ref)
                    resolve(url)
                }
            )
        })
    }

    const generateAllAssets = async () => {
        const { fontFamily, fullName, version } = values.fontData.generated || {}
        if (!font || !ttfFile || !fontFamily || !fullName || !version) return

        applyMetadata()
        const { sku } = values
        const ttfBuffer = font.toArrayBuffer()
        const ttfBlob = new Blob([ttfBuffer], { type: 'font/ttf' })

        const zip = new JSZip()
        zip.file('font.ttf', ttfBlob)

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipFile = new File([zipBlob], 'client_package.zip', { type: 'application/zip' })

        const folderPath = `products/${sku}/files`
        const zipUrl = await uploadWithProgress(`${folderPath}/client_package.zip`, zipFile)
        await uploadWithProgress(`${folderPath}/font.ttf`, ttfBlob)

        setDownloadUrl(zipUrl)
    }

    useEffect(() => {
        const loadFontFromBucket = async () => {
            try {
                const sku = values.sku
                if (!sku) return
                const fontRef = ref(storage, `products/${sku}/files/font.ttf`)
                const url = await getDownloadURL(fontRef)
                const res = await fetch(url)
                const arrayBuffer = await res.arrayBuffer()
                const parsedFont = opentype.parse(arrayBuffer)
                setFont(parsedFont)
                setGlyphCount(parsedFont.glyphs.length)
                generatePreviewSVG(parsedFont)
            } catch (err) {
                console.info('No existing font found in bucket.')
            }
        }
        loadFontFromBucket()
    }, [values.sku])

    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mb-2">📦 Generate Font Assets</h5>

            <FormItem label="Upload .TTF File">
                <input type="file" accept=".ttf" onChange={handleTtfUpload} />
                {ttfFile && <p className="text-sm text-gray-500 mt-1">{ttfFile.name}</p>}
            </FormItem>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <FormItem label="Font Family Name">
                    <Field name="fontData.generated.fontFamily" placeholder="Font Family" component={Input} />
                </FormItem>
                <FormItem label="Full Name">
                    <Field name="fontData.generated.fullName" placeholder="Full Name" component={Input} />
                </FormItem>
                <FormItem label="Version">
                    <Field name="fontData.generated.version" placeholder="Version" component={Input} />
                </FormItem>
            </div>

            <p className="text-sm mt-4">🔢 Glyphs: <strong>{glyphCount}</strong></p>

            {previewSvg && (
                <div className="mt-4">
                    <h6 className="font-semibold mb-2">Preview</h6>
                    <div
                        className="rounded border w-full max-w-xl overflow-x-auto bg-white px-6 py-4"
                        dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                </div>
            )}

            <Button onClick={generateAllAssets}
                disabled={!font || !ttfFile || !values.fontData.generated?.fontFamily || !values.fontData.generated?.fullName || !values.fontData.generated?.version}
                className="mt-6" variant="solid" type="button">
                ⚙️ Generate & Upload
            </Button>

            {isUploading && (
                <div className="mt-3 w-full bg-gray-200 rounded">
                    <div
                        className="bg-blue-500 text-xs text-white p-1 text-center rounded"
                        style={{ width: `${uploadProgress}%` }}
                    >{uploadProgress}%</div>
                </div>
            )}

            {downloadUrl && (
                <Button
                    onClick={() => saveAs(downloadUrl, 'client_package.zip')}
                    className="mt-3"
                    variant="twoTone"
                    type="button"
                >📥 Download ZIP</Button>
            )}
        </AdaptableCard>
    )
}

export default AssetsFields