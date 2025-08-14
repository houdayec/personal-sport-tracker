import { useEffect, useRef, useState } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Notification from '@/components/ui/Notification'
import { toast, Upload } from '@/components/ui'
import { storage } from '@/firebase'
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage'
import opentype from 'opentype.js'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Field, FormikErrors, FormikTouched, FieldProps, useFormikContext } from 'formik'
import { HiCheck, HiCheckCircle, HiOutlineCloudUpload } from 'react-icons/hi'
import { BsGear } from 'react-icons/bs'
import { FaDownload } from 'react-icons/fa'
import fontkit from 'fontkit'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

type AssetsFormFieldsName = {
    name: string
    sku: string
    category: string
    fontData: {
        generated: {
            fontFamily: string
            fullName: string
            version: string
            uploaded?: boolean
        }
    }
}

type AssetsFormFields = {
    touched: FormikTouched<AssetsFormFieldsName>
    errors: FormikErrors<AssetsFormFieldsName>
}

interface GlyphAsset {
    char: string
    svgBlob: Blob
    pngBlob: Blob
}

const AssetsFields = (props: AssetsFormFields) => {
    const { values, setFieldValue } = useFormikContext<any>()
    const { touched, errors } = props
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
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [originalFontBuffer, setOriginalFontBuffer] = useState<ArrayBuffer | null>(null)
    const [fontNamePreviewUrl, setFontNamePreviewUrl] = useState<string | null>(null)

    const totalFilesToUpload = glyphAssets.length * 2 + (finalFontBuffer ? 6 : 0)
    const generationCompleted = glyphAssets.length > 0 && !isGenerating
    const uploadCompleted = !isUploading && values.fontData?.generated?.uploaded === true

    useEffect(() => {
        const productName = values.name?.trim()
        const familyField = values.fontData?.generated?.fontFamily
        const fullNameField = values.fontData?.generated?.fullName

        if (productName) {
            if (!familyField) {
                setFieldValue('fontData.generated.fontFamily', productName)
            }
            if (!fullNameField) {
                setFieldValue('fontData.generated.fullName', productName)
            }
        }
    }, [values.name, values.fontData?.generated?.fontFamily, values.fontData?.generated?.fullName, setFieldValue])

    useEffect(() => {
        const loadExistingFont = async () => {
            const sku = values.sku
            if (!sku) return
            setIsFontLoading(true)
            try {
                const fontRef = ref(storage, `products/${sku}/files/font.ttf`)
                const url = await getDownloadURL(fontRef)
                const resp = await fetch(url)
                const blob = await resp.blob()
                const arrayBuffer = await blob.arrayBuffer()
                const parsed = opentype.parse(arrayBuffer)
                setFont(parsed)
                setGlyphCount(parsed.glyphs.length)
                generatePreviewSVG(parsed)
                generateFontNamePreview(parsed, values.name || 'Font Name')
                setTtfFile(new File([blob], 'font.ttf', { type: blob.type }))
            } catch (error) {
                console.error('Failed to load font:', error)
            }
            setIsFontLoading(false)
        }
        loadExistingFont()
    }, [values.sku])

    useEffect(() => {
        if (fileInputRef.current && ttfFile) {
            const dt = new DataTransfer()
            dt.items.add(ttfFile)
            fileInputRef.current.files = dt.files
            const event = new Event('change', { bubbles: true })
            fileInputRef.current.dispatchEvent(event)
        }
    }, [ttfFile])


    interface Glyph {
        char: string
        name: string
    }


    function generateFontProofPng(font: opentype.Font, chars: string[]): Promise<Blob> {
        return new Promise(async (resolve) => {
            const perRow = 10
            const cellSize = 100
            const padding = 20
            const titleHeight = 130
            const footerHeight = 40
            const rows = Math.ceil(chars.length / perRow)
            const width = perRow * cellSize + padding * 2
            const height = titleHeight + rows * cellSize + footerHeight

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!

            // Background
            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, width, height)

            const watermark = new Image()
            watermark.src = '/img/others/fontmaze-watermark.png'
            await new Promise(res => watermark.onload = res)

            const watermarkHeight = height
            const watermarkWidth = watermark.height > 0
                ? watermarkHeight * (watermark.width / watermark.height)
                : watermarkHeight

            ctx.globalAlpha = 0.02
            ctx.drawImage(
                watermark,
                (width - watermarkWidth) / 2,
                0,
                watermarkWidth,
                watermarkHeight
            )
            ctx.globalAlpha = 1

            // Title: 2 rows, centered
            ctx.fillStyle = '#000'
            ctx.textAlign = 'center'

            const titlePath = font.getPath(values.name, 0, 0, 60)
            const bbox = titlePath.getBoundingBox()

            const scale = 1
            const xOffset = (width - (bbox.x2 - bbox.x1)) / 2 - bbox.x1
            const yOffset = 70

            ctx.fillStyle = '#000'
            ctx.save()
            ctx.translate(xOffset, yOffset)
            titlePath.draw(ctx)
            ctx.restore()

            ctx.font = '24px sans-serif'
            ctx.fillText('by FontMaze', width / 2, 110)

            // Glyphs
            let x = padding
            let y = titleHeight

            for (let i = 0; i < chars.length; i++) {
                const char = chars[i]
                const glyph = font.charToGlyph(char)
                if (!glyph || !glyph.path || glyph.path.commands.length === 0) continue

                const path = glyph.getPath(x + 20, y + 60, 60)
                path.draw(ctx)

                ctx.font = '10px sans-serif'
                ctx.fillText(char, x + 35, y + 85)

                x += cellSize
                if ((i + 1) % perRow === 0) {
                    x = padding
                    y += cellSize
                }
            }

            // Footer
            ctx.font = 'italic 12px sans-serif'
            ctx.textAlign = 'right'
            ctx.fillText('© FontMaze Studio – All rights reserved', width - padding, height - 10)

            canvas.toBlob(blob => resolve(blob!), 'image/png')
        })
    }

    const generateFontNamePreview = (font: opentype.Font, name: string) => {
        const canvas = document.createElement('canvas');
        const size = 500;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.error("2D canvas context not supported");
            return;
        }

        ctx.clearRect(0, 0, size, size);

        // Calculate font size to fit the canvas
        const path = font.getPath(name, 0, 0, 100);
        const bbox = path.getBoundingBox();
        const scale = Math.min(size / (bbox.x2 - bbox.x1), size / (bbox.y2 - bbox.y1));
        const fontSize = 100 * scale * 0.8; // Reduce by 20% for padding

        const newPath = font.getPath(name, 0, 0, fontSize);
        const newBbox = newPath.getBoundingBox();
        const xOffset = (size - (newBbox.x2 - newBbox.x1)) / 2 - newBbox.x1;
        const yOffset = (size - (newBbox.y2 - newBbox.y1)) / 2 - newBbox.y1;

        ctx.fillStyle = '#000';
        ctx.save();
        ctx.translate(xOffset, yOffset);
        newPath.draw(ctx);
        ctx.restore();

        setFontNamePreviewUrl(canvas.toDataURL('image/png'));
    }

    const handleTtfUpload = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        const buf = await file.arrayBuffer()
        setOriginalFontBuffer(buf)
        const parsed = opentype.parse(buf)
        const isOtf = file.name.toLowerCase().endsWith('.otf')
        let finalFile = file
        if (isOtf) {
            const ttfBuf = parsed.toArrayBuffer()
            const blob = new Blob([ttfBuf], { type: 'font/ttf' })
            const newName = file.name.replace(/\.otf$/i, '.ttf')
            finalFile = new File([blob], newName, { type: 'font/ttf' })
        }

        setTtfFile(finalFile)
        setFont(parsed)
        setGlyphCount(parsed.glyphs.length)
        generatePreviewSVG(parsed)
        generateFontNamePreview(parsed, values.name || 'Font Name') // Add this line
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
        font.names.designerURL = { en: 'https://www.fontmaze.com' }
        font.names.manufacturer = { en: 'FontMaze' }
        font.names.manufacturerURL = { en: 'https://www.fontmaze.com' }
        font.names.copyright = { en: 'All rights reserved to FontMaze' }
        font.names.description = { en: `${fullName} designed by FontMaze Studio` }
        font.names.license = { en: 'Personal Use Only.' }
        font.names.licenseURL = { en: 'https://www.fontmaze.com/licenses/font-license/' }
        font.names.trademark = { en: 'All rights reserved to FontMaze' }
        if (font.tables && font.tables.os2) {
            font.tables.os2.vendorID = 'FTMZ';
        } else {
            console.error('OS/2 table not found in the font.');
        }
        font.tables.os2.vendorID = 'FTMZ';
        ; (font.names as any).sampleText = { en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789' }
    }

    const generateTrademarkPreview = () => {
        if (!font) return
        const glyph = font.glyphs.get(0)
        const svg = generateScaledGlyphSVG(glyph)
        const base64 = `data:image/svg+xml;base64,${btoa(svg)}`
        setTrademarkSvgUrl(base64)
    }

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

    // Generate preview SVG grid of supported glyphs
    const generatePreviewSVG = (font: opentype.Font) => {
        const chars = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            special: '!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~',
        }

        const allChars = Object.values(chars).join('')
        const size = 24
        const pad = 12
        const cols = 16
        const rows = Math.ceil(allChars.length / cols)
        const cellSize = size + pad
        const w = cols * cellSize + pad
        const h = rows * cellSize + pad

        let paths = ''

        for (let i = 0; i < allChars.length; i++) {
            const char = allChars[i]
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = pad + col * cellSize
            const y = pad + row * cellSize + size

            const glyph = font.charToGlyph(char)

            const isMissing = !glyph || glyph.index === 0 || !glyph.path || glyph.path.commands.length === 0

            if (isMissing) {
                // Draw a cross (X) box for missing glyph
                const cross = `
                <line x1="${x}" y1="${y - size}" x2="${x + size}" y2="${y}" stroke="red" stroke-width="2" />
                <line x1="${x + size}" y1="${y - size}" x2="${x}" y2="${y}" stroke="red" stroke-width="2" />
            `
                paths += cross
                continue
            }

            const path = glyph.getPath(x, y, size).toSVG(3)
            paths += path
        }

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#fff"/>
  <g fill="black">${paths}</g>
</svg>
`.trim()

        setPreviewSvg(svg)
    }


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
            ctx.setTransform(scale, 0, 0, -scale, x, y + size)
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
    }

    const upload = (path: string, blob: Blob): Promise<void> => new Promise((res, rej) => {
        const task = uploadBytesResumable(ref(storage, path), blob)
        task.on('state_changed', snap => console.log(path, (snap.bytesTransferred / snap.totalBytes * 100).toFixed(0) + '%'), err => rej(err), () => res())
    })

    const safeCharMap: Record<string, string> = {
        '!': '_exclamation', '@': '_at', '#': '_hash', '$': '_dollar', '%': '_percent', '^': '_caret', '&': '_ampersand', '*': '_asterisk', '(': '_parenLeft', ')': '_parenRight', '-': '_dash', '_': '_underscore', '=': '_equals', '+': '_plus', '[': '_bracketLeft', ']': '_bracketRight', '{': '_braceLeft', '}': '_braceRight', ';': '_semicolon', ':': '_colon', "'": '_quote', '"': '_doubleQuote', ',': '_comma', '.': '_dot', '<': '_lessThan', '>': '_greaterThan', '/': '_slash', '?': '_question', '\\': '_backslash', '|': '_pipe', '`': '_backtick', '~': '_tilde'
    }

    const generateGlyphAssets = async () => {
        if (!font) return
        setIsGenerating(true)
        setUploadCount(0)
        setFieldValue('fontData.generated.uploaded', false)

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

                // Skip missing glyphs (common fallback is glyph index 0 or empty)
                const isMissing = !glyph || glyph.index === 0 || !glyph.path || glyph.path.commands.length === 0

                if (isMissing) continue

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
        if (!glyphAssets.length || !finalFontBuffer) return
        const sku = values.sku
        if (!sku) return
        setIsUploading(true)
        let count = 0

        const hasFontFiles = finalFontBuffer && values.fontData?.generated?.fullName

        for (const { char, svgBlob, pngBlob } of glyphAssets) {
            const safeChar = char in safeCharMap ? safeCharMap[char] : char
            await upload(`products/${sku}/files/Final Product/SVG/${safeChar}.svg`, svgBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/Final Product/PNG/${safeChar}.png`, pngBlob)
            count++; setUploadCount(count)
        }

        if (hasFontFiles) {
            const finalName = values.fontData.generated.fullName
            const ttfBlob = new Blob([finalFontBuffer], { type: 'font/ttf' })
            const otfBlob = new Blob([finalFontBuffer], { type: 'font/otf' })

            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~' +
                'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿŒœŠšŸƒ€'
            const proofBlob = await generateFontProofPng(font!, chars.split(''))

            await upload(`products/${sku}/files/font_map.png`, proofBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/Final Product/Font Preview.png`, proofBlob)
            count++; setUploadCount(count)

            const helpPdf = await fetch('/data/files/How to Get Help.pdf').then(r => r.blob())
            await upload(`products/${sku}/files/Final Product/How to Get Help.pdf`, helpPdf)
            count++; setUploadCount(count)

            await upload(`products/${sku}/files/font.ttf`, ttfBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/font.otf`, otfBlob)
            count++; setUploadCount(count)

            await upload(`products/${sku}/files/Final Product/Font Files To Install/${finalName}.ttf`, ttfBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/Final Product/Font Files To Install/${finalName}.otf`, otfBlob)
            count++; setUploadCount(count)
        }

        if (originalFontBuffer) {
            const originalTtfBlob = new Blob([originalFontBuffer], { type: 'font/ttf' })
            const originalOtfBlob = new Blob([originalFontBuffer], { type: 'font/otf' })

            await upload(`products/${sku}/files/original_font.ttf`, originalTtfBlob)
            count++; setUploadCount(count)
            await upload(`products/${sku}/files/original_font.otf`, originalOtfBlob)
            count++; setUploadCount(count)
        }

        setFieldValue('fontData.generated.uploaded', true)
        toast.push(
            <Notification title="Uploaded" type="success" duration={2500}>
                Uploaded {uploadCount}/{totalFilesToUpload} files
            </Notification>,
            { placement: 'top-center' }
        )
        setIsUploading(false)
    }

    const downloadZip = async () => {
        if (!glyphAssets.length) return
        const zip = new JSZip()
        const svgF = zip.folder('SVG')!
        const pngF = zip.folder('PNG')!

        glyphAssets.forEach(({ char, svgBlob, pngBlob }) => {
            const safeChar = char in safeCharMap ? safeCharMap[char] : char
            svgF.file(`${safeChar}.svg`, svgBlob)
            pngF.file(`${safeChar}.png`, pngBlob)
        })

        const fontName = values.fontData.generated.fullName || values.sku || 'glyphs'
        const baseName = values.sku || 'font'

        if (finalFontBuffer && fontName) {
            const ttfBlob = new Blob([finalFontBuffer], { type: 'font/ttf' })
            const otfBlob = new Blob([finalFontBuffer], { type: 'font/otf' })
            const fontFolder = zip.folder('Font Files To Install')!

            fontFolder.file(`${fontName}.ttf`, ttfBlob)
            fontFolder.file(`${fontName}.otf`, otfBlob)
        }

        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, `${baseName}_${fontName}.zip`)
    }

    const handleSeeCloudFiles = () => {
        const sku = values.sku
        if (!sku) return
        const url = `https://console.firebase.google.com/u/0/project/fmz-dashboard/storage/fmz-dashboard.firebasestorage.app/files/~2Fproducts~2F${sku}~2Ffiles~2FFinal%20Product`
        window.open(url, '_blank')
    }

    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mb-2">Generate Font Files</h5>
            <FormItem label="Upload .TTF or .OTF File (OTF will be converted to TTF)">
                <Upload
                    draggable
                    accept=".ttf .otf"
                    ref={fileInputRef}
                    onChange={files => handleTtfUpload(files)}
                />
                {isFontLoading && (
                    <div className="mt-4 flex items-center gap-2">
                        <Spinner size={30} />
                        <span>Loading existing font...</span>
                    </div>
                )}
            </FormItem>

            {/* Combined Font Preview and Status */}
            {ttfFile && !isFontLoading && (
                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-xl text-green-600">✅ {ttfFile.name} loaded from the cloud</p>
                    </div>
                    <p className="text-sm text-gray-500">🔢 Glyphs available: <strong>{glyphCount}</strong></p>
                    {fontNamePreviewUrl && (
                        <div className="mt-4 p-4 border rounded-lg bg-white flex items-center justify-center">
                            <img
                                src={fontNamePreviewUrl}
                                alt="Font Name Preview"
                                className="w-full h-auto max-h-48 object-contain"
                            />
                        </div>
                    )}
                </div>
            )}

            {!ttfFile && !isFontLoading && (
                <p className="text-sm text-gray-400 mt-1">No font file selected</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <FormItem label="Font Family Name" invalid={(errors.fontData?.generated?.fontFamily && touched.fontData?.generated?.fontFamily) as boolean} errorMessage={errors.fontData?.generated?.fontFamily}>
                    <Field name="fontData.generated.fontFamily" component={Input} />
                </FormItem>
                <FormItem label="Full Name"><Field name="fontData.generated.fullName" component={Input} /></FormItem>
                <FormItem label="Version"><Field name="fontData.generated.version" component={Input} /></FormItem>
            </div>

            {generationCompleted && (
                <div className="mt-6">
                    <div className="grid md:grid-cols-3 gap-6 items-start">
                        {/* Character Preview */}
                        <div className="md:col-span-2">
                            <h6 className="font-semibold mb-2">Character Map Preview</h6>
                            <div className="border rounded p-2 overflow-x-auto bg-white">
                                <div dangerouslySetInnerHTML={{ __html: previewSvg || '' }} />
                            </div>
                            <p className="text-s text-gray-500 mt-2">
                                ✅ {glyphAssets.length} glyphs generated
                                {' • '}
                                ❌ {Object.values({
                                    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                                    lowercase: 'abcdefghijklmnopqrstuvwxyz',
                                    numbers: '0123456789',
                                    special: '!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~',
                                }).join('').length - glyphAssets.length} skipped (not in font)
                            </p>

                            <Button
                                size="sm"
                                className="mt-3"
                                icon={<FaDownload />}
                                onClick={async () => {
                                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~'
                                    const proofBlob = await generateFontProofPng(font!, chars.split(''))
                                    saveAs(proofBlob, `${values.name || 'Font'}_proof.png`)
                                }}
                            >
                                Download Font Proof
                            </Button>

                        </div>

                        {/* Trademark */}
                        {trademarkSvgUrl && (
                            <div className="md:w-full">
                                <h6 className="font-semibold mb-2">Trademark Glyph (.notdef)</h6>
                                <div className="w-32 h-32 border rounded bg-white flex items-center justify-center">
                                    <img src={trademarkSvgUrl} alt=".notdef glyph" className="max-w-[80%] max-h-[80%]" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-semibold">Process Checklist</span>
                </div>
                <div className="space-y-4">
                    {/* Step 1: Generate Assets */}
                    <div className="flex items-center gap-4">
                        {isGenerating ? <Spinner /> : generationCompleted ? <HiCheckCircle className="text-green-500" size={20} /> : <span className="w-5 h-5 flex items-center justify-center text-gray-400">•</span>}
                        <Button
                            onClick={generateGlyphAssets}
                            disabled={!font || isGenerating}
                            variant="twoTone"
                            icon={<BsGear />}
                        >
                            Generate Font Files
                        </Button>
                    </div>

                    {/* Step 2: Upload Files */}
                    <div className="flex items-center gap-4">
                        {isUploading ? <Spinner /> : uploadCompleted ? <HiCheckCircle className="text-green-500" size={20} /> : <span className="w-5 h-5 flex items-center justify-center text-gray-400">•</span>}
                        <Button
                            onClick={uploadGlyphAssets}
                            disabled={!generationCompleted || isUploading}
                            variant="twoTone"
                            icon={<HiOutlineCloudUpload />}
                        >
                            {`Upload Files ${isUploading ? `(${uploadCount}/${totalFilesToUpload})` : ''}`}
                        </Button>
                    </div>
                </div>
            </div>

            {uploadCompleted && (
                <>
                    <h6 className="font-semibold mb-2 mt-6">Debug & Results</h6>
                    <div className="flex gap-4">
                        <Button onClick={downloadZip} disabled={!uploadCompleted} type="button" icon={<FaDownload />}>
                            Download Assets Zip
                        </Button>
                        <Button onClick={handleSeeCloudFiles} disabled={!uploadCompleted} type="button" icon={<HiOutlineCloudUpload />}>
                            See Files on Cloud
                        </Button>
                    </div>
                </>
            )}
        </AdaptableCard>
    )
}
export default AssetsFields