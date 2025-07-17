// AssetsFields.tsx
import { useEffect, useState } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Notification from '@/components/ui/Notification'
import { toast } from '@/components/ui'
import { storage } from '@/firebase'
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage'
import opentype from 'opentype.js'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Field, FormikErrors, FormikTouched, FieldProps, useFormikContext } from 'formik'

type FormFieldsName = {
    name: string
    sku: string
    category: string
}

type ThumbnailFormFields = {
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
}

interface GlyphAsset {
    char: string
    svgBlob: Blob
    pngBlob: Blob
}

const AssetsFields = (props: ThumbnailFormFields) => {
    const { values } = useFormikContext<any>()
    const [ttfFile, setTtfFile] = useState<File | null>(null)
    const [font, setFont] = useState<opentype.Font | null>(null)
    const [glyphCount, setGlyphCount] = useState(0)
    const [previewSvg, setPreviewSvg] = useState<string | null>(null)
    const [glyphAssets, setGlyphAssets] = useState<GlyphAsset[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadCount, setUploadCount] = useState(0)
    const [trademarkSvgUrl, setTrademarkSvgUrl] = useState<string | null>(null)
    const [isFontLoading, setIsFontLoading] = useState(false)
    const [finalFontBuffer, setFinalFontBuffer] = useState<ArrayBuffer | null>(null)

    useEffect(() => {
        const loadExistingFont = async () => {
            const sku = values.sku
            if (!sku) return
            setIsFontLoading(true)
            try {
                const fontRef = ref(storage, `products/${sku}/files/font.ttf`)
                const url = await getDownloadURL(fontRef)
                const resp = await fetch(url)
                const arrayBuffer = await resp.arrayBuffer()
                const parsed = opentype.parse(arrayBuffer)
                setFont(parsed)
                setGlyphCount(parsed.glyphs.length)
                generatePreviewSVG(parsed)
                const blob = await resp.blob()
                setTtfFile(new File([blob], 'font.ttf', { type: blob.type }))
            } catch {
                console.info('No existing font found at ', storage, `products/${sku}/files/font.ttf`)
            }
            setIsFontLoading(false)
        }
        loadExistingFont()
    }, [values.sku])

    const handleTtfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setTtfFile(file)
        const buf = await file.arrayBuffer()
        const parsed = opentype.parse(buf)
        setFont(parsed)
        setGlyphCount(parsed.glyphs.length)
        generatePreviewSVG(parsed)
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
        font.names.license = { en: 'Personal Use Only.' }
        font.names.licenseURL = { en: 'https://www.fontmaze.com/licenses/font-license/' }
        font.names.trademark = { en: 'FontMaze' }
            ; (font.names as any).sampleText = { en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789' }
    }

    // Generate a visual preview of the .notdef glyph (trademark marker)
    const generateTrademarkPreview = () => {
        if (!font) return
        const glyph = font.glyphs.get(0)
        const svg = generateScaledGlyphSVG(glyph)
        const base64 = `data:image/svg+xml;base64,${btoa(svg)}`
        setTrademarkSvgUrl(base64)
    }

    // Add hidden FontMaze trademark glyph in Private Use Area
    const injectTrademarkIntoNotdef = () => {
        if (!font) return

        const glyphSize = 1000
        const textSize = 160

        const fontPath = font.getPath('font', 0, 0, textSize)
        const mazePath = font.getPath('maze', 0, 0, textSize)

        const transformPathY = (path: opentype.Path, y: number) => {
            const bb = path.getBoundingBox()
            const dx = (glyphSize - (bb.x2 - bb.x1)) / 2 - bb.x1
            const dy = y - bb.y1

            path.commands.forEach(cmd => {
                if ('x' in cmd) cmd.x += dx
                if ('x1' in cmd) cmd.x1 += dx
                if ('x2' in cmd) cmd.x2 += dx
                if ('y' in cmd) cmd.y = glyphSize - (cmd.y + dy)
                if ('y1' in cmd) cmd.y1 = glyphSize - (cmd.y1 + dy)
                if ('y2' in cmd) cmd.y2 = glyphSize - (cmd.y2 + dy)
            })
        }

        transformPathY(fontPath, 380)
        transformPathY(mazePath, 650)

        const fullPath = new opentype.Path()
        fullPath.commands.push(...fontPath.commands, ...mazePath.commands)

        const notdefGlyph = font.glyphs.get(0)
        notdefGlyph.path = fullPath
        notdefGlyph.advanceWidth = glyphSize
    }



    // Generate SVG preview showing glyphs in rows & columns (more compact layout)
    const generatePreviewSVG = (font: opentype.Font) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const size = 24
        const pad = 12
        const cols = 16
        const rows = Math.ceil(chars.length / cols)

        const cellSize = size + pad
        const w = cols * cellSize + pad
        const h = rows * cellSize + pad

        let paths = ''

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i]
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = pad + col * cellSize
            const y = pad + row * cellSize + size // baseline offset
            const path = font.charToGlyph(char).getPath(x, y, size).toSVG(3)
            paths += path
        }

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect width="100%" height="100%" fill="#fff"/>
        <g fill="black">${paths}</g>
    </svg>`

        setPreviewSvg(svg)
    }


    // Center glyph in fixed canvas for PNG
    // Create centered PNG blob of glyph in a square canvas
    // Create centered PNG blob of glyph using transform matrix
    const createPngBlob = (glyph: opentype.Glyph, size: number): Promise<Blob> => {
        return new Promise(res => {
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')!

            const path = glyph.getPath(0, 0, size)
            const bbox = path.getBoundingBox()

            const padding = 0.1 * size
            const scale = Math.min(
                (size - 2 * padding) / (bbox.x2 - bbox.x1),
                (size - 2 * padding) / (bbox.y2 - bbox.y1)
            )

            const x = (size - (bbox.x2 - bbox.x1) * scale) / 2 - bbox.x1 * scale
            const y = (size - (bbox.y2 - bbox.y1) * scale) / 2 - bbox.y1 * scale

            ctx.fillStyle = '#000'
            ctx.setTransform(scale, 0, 0, -scale, x, y + size) // mirror y
            path.draw(ctx)

            canvas.toBlob(blob => res(blob!), 'image/png')
        })
    }

    const generateScaledGlyphPNG = (glyph: opentype.Glyph): Promise<Blob> => {
        return new Promise((resolve) => {
            const path = glyph.getPath(0, 0, 100)
            const bbox = path.getBoundingBox()
            const glyphHeight = bbox.y2 - bbox.y1 || 1
            const targetHeight = 512
            const scale = targetHeight / glyphHeight

            const canvas = document.createElement('canvas')
            const width = Math.ceil((bbox.x2 - bbox.x1) * scale)
            const height = Math.ceil(targetHeight)

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!

            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, width, height)

            ctx.fillStyle = '#000'
            ctx.translate(-bbox.x1 * scale, -bbox.y1 * scale)
            ctx.scale(scale, scale)
            path.draw(ctx)

            canvas.toBlob((blob) => {
                if (blob) resolve(blob)
            }, 'image/png')
        })
    }

    const generateScaledGlyphSVG = (glyph: opentype.Glyph): string => {
        const path = glyph.getPath(0, 0, 100)
        const bbox = path.getBoundingBox()
        const targetHeight = 1000
        const scale = targetHeight / (bbox.y2 - bbox.y1)
        const width = (bbox.x2 - bbox.x1) * scale
        const height = targetHeight

        return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g transform="scale(${scale}) translate(${-bbox.x1}, ${-bbox.y1})">
    <path d="${path.toPathData(3)}" fill="black" />
  </g>
</svg>
`.trim()
        /*const width = bbox.x2 - bbox.x1
        const height = bbox.y2 - bbox.y1

        return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bbox.x1} ${bbox.y1} ${width} ${height}">
  <path d="${path.toPathData(3)}" fill="black" />
</svg>
`.trim()*/
    }

    const upload = (path: string, blob: Blob): Promise<void> => new Promise((res, rej) => {
        const task = uploadBytesResumable(ref(storage, path), blob)
        task.on('state_changed', snap => console.log(path, (snap.bytesTransferred / snap.totalBytes * 100).toFixed(0) + '%'), err => rej(err), () => res())
    })

    // Generate SVG and PNG glyph assets using the working logic from previous version
    const generateGlyphAssets = async () => {
        if (!font) return

        setIsGenerating(true)
        applyMetadata()
        injectTrademarkIntoNotdef()

        const buffer = font.toArrayBuffer()
        setFinalFontBuffer(buffer)

        const chars = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            special: '!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~',
        }

        const assets: GlyphAsset[] = []

        for (const characters of Object.values(chars)) {
            for (const char of characters) {
                const glyph = font.charToGlyph(char)
                if (!glyph || !glyph.path || glyph.path.commands.length === 0) continue

                const svgBlob = new Blob(
                    [generateScaledGlyphSVG(glyph)],
                    { type: 'image/svg+xml' }
                )

                const pngBlob = await generateScaledGlyphPNG(glyph)

                assets.push({ char, svgBlob, pngBlob })
            }
        }

        setGlyphAssets(assets)
        toast.push(
            <Notification title="Generated" type="success" duration={2500}>
                {assets.length} glyphs ready
            </Notification>,
            { placement: 'top-center' }
        )

        generateTrademarkPreview()
        setIsGenerating(false)
    }


    const uploadGlyphAssets = async () => {
        if (!glyphAssets.length) return
        const sku = values.sku
        if (!sku) return
        setIsUploading(true)

        let count = 0
        let total = glyphAssets.length * 2

        const hasFontFiles = finalFontBuffer && values.fontData?.generated?.fullName
        if (hasFontFiles) total += 4

        for (const { char, svgBlob, pngBlob } of glyphAssets) {
            await upload(`products/${sku}/files/Final Product/SVG/${char}.svg`, svgBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/Final Product/PNG/${char}.png`, pngBlob)
            count++; setUploadCount(count)
        }

        if (hasFontFiles) {
            const finalName = values.fontData.generated.fullName
            const ttfBlob = new Blob([finalFontBuffer], { type: 'font/ttf' })
            const otfBlob = new Blob([finalFontBuffer], { type: 'font/otf' })

            await upload(`products/${sku}/files/font.ttf`, ttfBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/font.otf`, otfBlob)
            count++; setUploadCount(count)

            await upload(`products/${sku}/files/Final Product/Font Files To Install/${finalName}.ttf`, ttfBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/Final Product/Font Files To Install/${finalName}.otf`, otfBlob)
            count++; setUploadCount(count)
        }

        toast.push(
            <Notification title="Uploaded" type="success" duration={2500}>
                Uploaded {uploadCount}/{total}
            </Notification>,
            { placement: 'top-center' }
        )

        setIsUploading(false)
    }


    const downloadZip = async () => {
        if (!glyphAssets.length) return
        const zip = new JSZip()
        const svgF = zip.folder('SVG')!, pngF = zip.folder('PNG')!
        glyphAssets.forEach(({ char, svgBlob, pngBlob }) => { svgF.file(`${char}.svg`, svgBlob); pngF.file(`${char}.png`, pngBlob) })
        const content = await zip.generateAsync({ type: 'blob' })
        const name = values.fontData.generated.fullName || values.sku || 'glyphs'
        saveAs(content, `${name}.zip`)
    }

    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mb-2">📦 Generate Font Assets</h5>
            <FormItem label="Upload .TTF File">
                <input type="file" accept=".ttf" onChange={handleTtfUpload} />
                {ttfFile ? (
                    <p className="text-sm text-green-600 mt-1">✅ {ttfFile.name} loaded</p>
                ) : (
                    <p className="text-sm text-gray-400 mt-1">No font file selected</p>
                )}
            </FormItem>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <FormItem label="Font Family Name"><Field name="fontData.generated.fontFamily" component={Input} /></FormItem>
                <FormItem label="Full Name"><Field name="fontData.generated.fullName" component={Input} /></FormItem>
                <FormItem label="Version"><Field name="fontData.generated.version" component={Input} /></FormItem>
            </div>
            <p className="text-sm mt-4">🔢 Glyphs: <strong>{glyphCount}</strong></p>
            {previewSvg && <div className="mt-4 w-full"><h6 className="font-semibold mb-2">Preview</h6><div dangerouslySetInnerHTML={{ __html: previewSvg }} className="w-full" /></div>}

            {glyphAssets.length > 0 && (
                <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-4">
                    {glyphAssets.map(({ char, svgBlob }) => {
                        const url = URL.createObjectURL(svgBlob)
                        return (
                            <div key={char} className="flex flex-col items-center">
                                <img src={url} alt={char} className="w-12 h-12" />
                                <span className="text-xs mt-1">{char}</span>
                            </div>
                        )
                    })}
                </div>
            )}

            {trademarkSvgUrl && (
                <div className="mt-6">
                    <h6 className="font-semibold mb-2">Trademark (.notdef)</h6>
                    <div className="w-24 h-24 border rounded bg-white flex items-center justify-center">
                        <img src={trademarkSvgUrl} alt=".notdef glyph" className="w-20 h-20" />
                    </div>
                </div>
            )}
            <div className="mt-6 flex gap-4">

                <Button onClick={generateGlyphAssets} disabled={!font || isGenerating} type="button" variant="solid">
                    {isGenerating ? (
                        <span className="flex items-center gap-2">
                            <Spinner /> Generating…
                        </span>
                    ) : '⚙️ Generate Assets'}
                </Button>

                <Button onClick={uploadGlyphAssets} disabled={!glyphAssets.length || isUploading} type="button">
                    {isUploading ? (
                        <span className="flex items-center gap-2">
                            <Spinner /> Uploading… {uploadCount}/{glyphAssets.length * 2}
                        </span>
                    ) : '📤 Upload Assets'}
                </Button>

                <Button onClick={downloadZip} disabled={!glyphAssets.length} type="button">
                    ⬇️ Download Assets
                </Button>


            </div>
        </AdaptableCard>
    )
}
export default AssetsFields
