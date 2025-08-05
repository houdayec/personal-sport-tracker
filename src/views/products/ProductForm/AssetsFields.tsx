// AssetsFields.tsx
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
import { Field, FormikErrors, FormikTouched, FieldProps, useFormikContext, FormikProps, FieldInputProps } from 'formik'
import { FormModel } from '@/views/website/CustomerForm'
import fs from 'fs'
import blobStream from 'blob-stream'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from 'fontkit'


type AssetsFormFieldsName = {
    name: string
    sku: string
    category: string
    fontData: {
        generated: {
            fontFamily: string
            fullName: string
            version: string
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

            // If your component depends on onChange
            const event = new Event('change', { bubbles: true })
            fileInputRef.current.dispatchEvent(event)
        }
    }, [ttfFile])

    interface Glyph {
        char: string
        name: string
    }


    // Generates a font glyph proof PDF using embedded font or fallback SVG paths
    async function generateFontProofPdfFromFont(fontBuffer: ArrayBuffer, fontName: string): Promise<Blob> {
        const font = opentype.parse(fontBuffer)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~' +
            'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿŒœŠšŸƒ€'

        const doc = await PDFDocument.create()
        let page = doc.addPage([600, 800])
        let y = 750
        const perRow = 6
        const cellWidth = 90
        const cellHeight = 80
        let x = 50

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i]
            const glyph = font.charToGlyph(char)

            if (!glyph || !glyph.path || glyph.path.commands.length === 0) continue

            const path = glyph.getPath(0, 0, 60).toPathData(3)
            const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 1000 1000">
  <path d="${path}" fill="black"/>
</svg>`.trim()

            const svgImage = await doc.embedSvg(svg)
            page.drawImage(svgImage, { x, y: y - 60, width: cellWidth, height: cellHeight })

            x += cellWidth + 10
            if ((i + 1) % perRow === 0) {
                x = 50
                y -= cellHeight + 20
                if (y < 100) {
                    page = doc.addPage([600, 800])
                    y = 750
                }
            }
        }

        const pdfBytes = await doc.save()
        return new Blob([pdfBytes], { type: 'application/pdf' })
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

            // Draw watermark without stretching, keep square ratio and fill height
            const watermark = new Image()
            watermark.src = '/img/others/fontmaze-watermark.png'
            await new Promise(res => watermark.onload = res)

            const watermarkHeight = height
            const watermarkWidth = watermark.height > 0
                ? watermarkHeight * (watermark.width / watermark.height)
                : watermarkHeight // fallback

            ctx.globalAlpha = 0.02
            ctx.drawImage(
                watermark,
                (width - watermarkWidth) / 2, // center horizontally
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

            // Center the path
            const scale = 1
            const xOffset = (width - (bbox.x2 - bbox.x1)) / 2 - bbox.x1
            const yOffset = 70

            ctx.fillStyle = '#000'
            ctx.save()
            ctx.translate(xOffset, yOffset)
            titlePath.draw(ctx)
            ctx.restore()

            // “by FontMaze” lower to add vertical gap
            ctx.font = '24px sans-serif'
            ctx.fillText('by FontMaze', width / 2, 110) // was 70

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

    const handleTtfUpload = async (files: File[]) => {
        const file = files[0]
        console.log('[Font Upload] Received:', file)
        if (!file) return

        const buf = await file.arrayBuffer()
        const parsed = opentype.parse(buf)

        // If .otf, convert to .ttf and use the generated blob instead
        const isOtf = file.name.toLowerCase().endsWith('.otf')
        let finalFile = file

        if (isOtf) {
            console.log('[Font Upload] Converting .otf to .ttf…')
            const ttfBuf = parsed.toArrayBuffer()
            const blob = new Blob([ttfBuf], { type: 'font/ttf' })
            const newName = file.name.replace(/\.otf$/i, '.ttf')
            finalFile = new File([blob], newName, { type: 'font/ttf' })
            console.log('[Font Upload] Converted to:', finalFile)
        }

        setTtfFile(finalFile)
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
        font.names.designerURL = { en: 'https://www.fontmaze.com' }
        font.names.manufacturer = { en: 'FontMaze' }
        font.names.manufacturerURL = { en: 'https://www.fontmaze.com' }
        font.names.copyright = { en: 'All rights reserved to FontMaze' }
        font.names.description = { en: `${fullName} designed by FontMaze Studio` }
        font.names.license = { en: 'Personal Use Only.' }
        font.names.licenseURL = { en: 'https://www.fontmaze.com/licenses/font-license/' }
        font.names.trademark = { en: 'All rights reserved to FontMaze' }
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

    // Maps special characters to safe readable names
    const safeCharMap: Record<string, string> = {
        '!': '_exclamation',
        '@': '_at',
        '#': '_hash',
        '$': '_dollar',
        '%': '_percent',
        '^': '_caret',
        '&': '_ampersand',
        '*': '_asterisk',
        '(': '_parenLeft',
        ')': '_parenRight',
        '-': '_dash',
        '_': '_underscore',
        '=': '_equals',
        '+': '_plus',
        '[': '_bracketLeft',
        ']': '_bracketRight',
        '{': '_braceLeft',
        '}': '_braceRight',
        ';': '_semicolon',
        ':': '_colon',
        "'": '_quote',
        '"': '_doubleQuote',
        ',': '_comma',
        '.': '_dot',
        '<': '_lessThan',
        '>': '_greaterThan',
        '/': '_slash',
        '?': '_question',
        '\\': '_backslash',
        '|': '_pipe',
        '`': '_backtick',
        '~': '_tilde'
    }

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

            const glyphs = font
                ? Array.from({ length: font.glyphs.length }, (_, i) => font.glyphs.get(i))
                : []

            const glyphsWithChar: Glyph[] = glyphAssets.map(g => ({
                name: font?.charToGlyph(g.char).name || g.char,
                char: g.char,
                unicode: g.char.charCodeAt(0)
            }))


            //const pdfBlob = await generateGlyphProofPdf(glyphs, values.fontData.generated.fullName)
            /*const pdfBlob = await generateFontProofPdfFromFont(finalFontBuffer!, values.fontData.generated.fullName)

            const link = document.createElement('a')
            link.href = URL.createObjectURL(pdfBlob)
            link.download = `${finalName}_proof.pdf`
            link.click()*/

            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~' +
                'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿŒœŠšŸƒ€'
            const blob = await generateFontProofPng(font!, chars.split(''))
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = 'font-proof.png'
            link.click()
            URL.revokeObjectURL(url)

            await upload(`products/${sku}/files/font_map.png`, blob)
            await upload(`products/${sku}/files/Final Product/Font Preview.png`, blob)

            count++; setUploadCount(count)

            // Upload the help PDF guide to Final Product folder
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

            setFieldValue('fontData.generated.uploaded', true)
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


    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mb-2">📦 Generate Font Assets</h5>
            <FormItem label="Upload .TTF or .OTF File (OTF will be converted to TTF)">
                <Upload draggable accept=".ttf .otf"
                    ref={fileInputRef}
                    onChange={(files) =>
                        handleTtfUpload(files)
                    }
                />
                {ttfFile ? (
                    <div className="mt-4">
                        <p className="text-sm text-green-600 mt-1">✅ {ttfFile.name} loaded</p>
                        <p className="text-sm">🔢 Glyphs: <strong>{glyphCount}</strong></p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 mt-1">No font file selected</p>
                )}
            </FormItem>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <FormItem
                    label="Font Family Name"
                    invalid={(errors.fontData?.generated?.fontFamily && touched.fontData?.generated?.fontFamily) as boolean}
                    errorMessage={errors.fontData?.generated?.fontFamily}

                >
                    <Field name="fontData.generated.fontFamily" component={Input} />
                </FormItem>
                <FormItem label="Full Name"><Field name="fontData.generated.fullName" component={Input} /></FormItem>
                <FormItem label="Version"><Field name="fontData.generated.version" component={Input} /></FormItem>
            </div>
            {previewSvg && <div className="mt-4 w-full"><h6 className="font-semibold mb-2">Preview</h6><div dangerouslySetInnerHTML={{ __html: previewSvg }} className="w-full" /></div>}

            {glyphAssets.length > 0 && (
                <div>
                    <h6 className="font-semibold mb-2 mt-6">Generated SVG Files</h6>
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

                <Button onClick={generateGlyphAssets} disabled={!font || isGenerating || isUploading} type="button" variant="twoTone">
                    {isGenerating ? (
                        <span className="flex items-center gap-2">
                            <Spinner /> Generating…
                        </span>
                    ) : '⚙️ Generate Assets'}
                </Button>

                <Button onClick={uploadGlyphAssets} disabled={!glyphAssets.length || isUploading} type="button" variant="twoTone">
                    {isUploading ? (
                        <span className="flex items-center gap-2">
                            <Spinner /> Uploading… {uploadCount}/{glyphAssets.length * 2}
                        </span>
                    ) : '📤 Upload Font & Assets'}
                </Button>

                <Button onClick={downloadZip} disabled={!glyphAssets.length || isUploading} type="button">
                    ⬇️ Download Assets
                </Button>


            </div>
        </AdaptableCard>
    )
}
export default AssetsFields
