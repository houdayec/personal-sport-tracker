// Draw canvas
    /*useEffect(() => {
        if (!fontLoaded || !watermarkImg) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        // Clear + background
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.fillStyle = main_bgColor
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        if (
            meta.main_gradientEnabled &&
            meta.main_gradientColor1 &&
            meta.main_gradientColor2 &&
            meta.main_gradientType
        ) {
            drawGradient(
                ctx,
                CANVAS_SIZE,
                CANVAS_SIZE,
                [meta.main_gradientColor1, meta.main_gradientColor2],
                meta.main_gradientType
            );
        }

        // Draw pattern
        if (main_patternType !== 'none' && patternImages[main_patternType]) {
            const img = patternImages[main_patternType]
            ctx.save()
            ctx.globalAlpha = main_patternOpacity
            const pat = ctx.createPattern(img, 'repeat')!
            ctx.fillStyle = pat
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.globalCompositeOperation = 'source-in'
            ctx.fillStyle = main_patternColor
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.restore()
        }

        // Draw watermark image with tint and opacity
        ctx.save()

        // Resize watermark if needed
        if (watermarkImg) {
            ctx.save()
            ctx.globalAlpha = main_watermarkOpacity
            ctx.drawImage(watermarkImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
            ctx.restore()
        }

        // Title text
        const titleArea = CANVAS_SIZE * 0.25
        const yTitle = PADDING + main_topOffset
        const tf = Math.floor(titleArea * main_titleScale)


        // Apply shadow style
        ctx.shadowColor = hexToRgba(shadowColor, shadowOpacity)
        ctx.shadowBlur = shadowBlur
        ctx.shadowOffsetX = shadowOffsetX
        ctx.shadowOffsetY = shadowOffsetY

        // Apply shadow style
        ctx.shadowColor = hexToRgba(shadowColor, shadowOpacity)
        ctx.shadowBlur = shadowBlur
        ctx.shadowOffsetX = shadowOffsetX
        ctx.shadowOffsetY = shadowOffsetY
        ctx.shadowBlur = shadowBlur
        ctx.shadowOffsetX = shadowOffsetX
        ctx.shadowOffsetY = shadowOffsetY

        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.font = `${tf}px ProductFont, sans-serif`
        ctx.fillStyle = main_titleColor
        ctx.fillText(main_titleText, CANVAS_SIZE / 2, yTitle)
        if (main_titleStrokeWidth) {
            ctx.lineWidth = main_titleStrokeWidth
            ctx.strokeStyle = main_titleStrokeColor
            ctx.strokeText(main_titleText, CANVAS_SIZE / 2, yTitle)
        }
        ctx.shadowColor = 'transparent'

        // Characters
        const topChars = yTitle + tf + PADDING
        const bottomHeight = CANVAS_SIZE - topChars - PADDING
        const count = lines.length
        const spacing = 80
        const baseF = Math.floor((bottomHeight - spacing * (count - 1)) / count)
        let cf = Math.floor(baseF * main_charScale)
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillStyle = main_charColor
        ctx.font = `${cf}px ProductFont, sans-serif`
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width))
        if (maxW > CANVAS_SIZE - 2 * PADDING) {
            const sc = (CANVAS_SIZE - 2 * PADDING) / maxW
            cf = Math.floor(cf * sc)
            ctx.font = `${cf}px ProductFont, sans-serif`
        }
        const totalH = cf * count + spacing * (count - 1)
        const sy = topChars + (bottomHeight - totalH) / 2
        lines.forEach((l, i) => ctx.fillText(l, CANVAS_SIZE / 2, sy + i * (cf + spacing)))

        setPreviewUrl(canvas.toDataURL('image/png'))
    }, [fontLoaded, watermarkImg, main_bgColor, main_patternType, main_patternColor, main_patternOpacity,
        main_titleText, main_titleColor, main_titleStrokeColor, main_titleStrokeWidth,
        main_titleScale, main_charScale, main_topOffset, main_showUppercase, main_showLowercase, main_showNumbers, main_showSpecials, main_charset,
        patternImages, main_watermarkColor, main_watermarkOpacity, main_charColor,
        shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowOpacity])*/
