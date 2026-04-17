import type {
    RunningGpxData,
    RunningGpxTrackPoint,
} from '@/features/fitness/training/types/workoutSession'

const EARTH_RADIUS_M = 6371000
const MAX_GPX_POINTS_STORED = 1200
const MAX_GPX_FILE_SIZE_BYTES = 8 * 1024 * 1024

const toRadians = (value: number): number => {
    return (value * Math.PI) / 180
}

const round = (value: number, decimals: number): number => {
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
}

const haversineDistanceM = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number => {
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2

    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

const sampleTrackPoints = (
    points: RunningGpxTrackPoint[],
    maxPoints: number,
): RunningGpxTrackPoint[] => {
    if (points.length <= maxPoints) {
        return points
    }

    const sampled: RunningGpxTrackPoint[] = []
    const step = (points.length - 1) / (maxPoints - 1)
    let lastIndex = -1

    for (let i = 0; i < maxPoints; i += 1) {
        const index = Math.round(i * step)
        if (index !== lastIndex && points[index]) {
            sampled.push(points[index])
            lastIndex = index
        }
    }

    const lastPoint = points[points.length - 1]
    if (sampled[sampled.length - 1] !== lastPoint) {
        sampled.push(lastPoint)
    }

    return sampled
}

const parseNumericText = (value: string | null | undefined): number | undefined => {
    if (!value) {
        return undefined
    }

    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        return undefined
    }

    return parsed
}

const parseTimeMs = (value: string | null | undefined): number | undefined => {
    if (!value) {
        return undefined
    }

    const timeMs = Date.parse(value)
    if (!Number.isFinite(timeMs) || timeMs <= 0) {
        return undefined
    }

    return timeMs
}

export const parseGpxFile = async (file: File): Promise<RunningGpxData> => {
    if (!file) {
        throw new Error('Aucun fichier GPX sélectionné.')
    }

    if (file.size > MAX_GPX_FILE_SIZE_BYTES) {
        throw new Error('Le fichier GPX est trop volumineux (max 8 Mo).')
    }

    if (typeof DOMParser === 'undefined') {
        throw new Error('Le parsing GPX n’est pas disponible dans cet environnement.')
    }

    const rawContent = await file.text()
    if (!rawContent.trim()) {
        throw new Error('Le fichier GPX est vide.')
    }

    const xml = new DOMParser().parseFromString(rawContent, 'application/xml')
    if (xml.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Le fichier GPX est invalide.')
    }

    const trkptNodes = Array.from(xml.getElementsByTagName('trkpt'))
    if (trkptNodes.length < 2) {
        throw new Error('Le fichier GPX doit contenir au moins 2 points de trace.')
    }

    type RawPoint = {
        lat: number
        lon: number
        eleM?: number
        timeMs?: number
    }

    const rawPoints: RawPoint[] = trkptNodes
        .map((node) => {
            const lat = parseNumericText(node.getAttribute('lat'))
            const lon = parseNumericText(node.getAttribute('lon'))

            if (
                typeof lat !== 'number' ||
                typeof lon !== 'number' ||
                lat < -90 ||
                lat > 90 ||
                lon < -180 ||
                lon > 180
            ) {
                return null
            }

            const eleM = parseNumericText(
                node.getElementsByTagName('ele')[0]?.textContent,
            )
            const timeMs = parseTimeMs(
                node.getElementsByTagName('time')[0]?.textContent,
            )

            return {
                lat,
                lon,
                ...(typeof eleM === 'number' ? { eleM } : {}),
                ...(typeof timeMs === 'number' ? { timeMs } : {}),
            }
        })
        .filter((point): point is RawPoint => Boolean(point))

    if (rawPoints.length < 2) {
        throw new Error('Impossible de lire les points GPS du fichier GPX.')
    }

    const firstTimeMs = rawPoints.find((point) => typeof point.timeMs === 'number')?.timeMs
    let lastTimeMs = firstTimeMs
    let totalDistanceM = 0
    let elevationGainM = 0
    let elevationLossM = 0
    let minElevationM: number | undefined
    let maxElevationM: number | undefined
    let elapsedSecFallback = 0

    const computedPoints: RunningGpxTrackPoint[] = rawPoints.map((point, index) => {
        if (typeof point.eleM === 'number') {
            minElevationM =
                typeof minElevationM === 'number'
                    ? Math.min(minElevationM, point.eleM)
                    : point.eleM
            maxElevationM =
                typeof maxElevationM === 'number'
                    ? Math.max(maxElevationM, point.eleM)
                    : point.eleM
        }

        if (index > 0) {
            const previous = rawPoints[index - 1]
            const segmentDistanceM = haversineDistanceM(
                previous.lat,
                previous.lon,
                point.lat,
                point.lon,
            )
            totalDistanceM += segmentDistanceM

            if (
                typeof previous.eleM === 'number' &&
                typeof point.eleM === 'number'
            ) {
                const deltaElevation = point.eleM - previous.eleM
                if (deltaElevation > 0) {
                    elevationGainM += deltaElevation
                } else if (deltaElevation < 0) {
                    elevationLossM += Math.abs(deltaElevation)
                }
            }

            if (
                typeof previous.timeMs === 'number' &&
                typeof point.timeMs === 'number' &&
                point.timeMs > previous.timeMs
            ) {
                elapsedSecFallback += (point.timeMs - previous.timeMs) / 1000
            }
        }

        if (typeof point.timeMs === 'number') {
            lastTimeMs = point.timeMs
        }

        const elapsedSecFromTime =
            typeof firstTimeMs === 'number' &&
            typeof point.timeMs === 'number' &&
            point.timeMs >= firstTimeMs
                ? (point.timeMs - firstTimeMs) / 1000
                : undefined

        const elapsedSec =
            typeof elapsedSecFromTime === 'number'
                ? elapsedSecFromTime
                : elapsedSecFallback

        return {
            lat: round(point.lat, 6),
            lon: round(point.lon, 6),
            distanceKm: round(totalDistanceM / 1000, 3),
            elapsedSec: Math.max(0, Math.round(elapsedSec)),
            ...(typeof point.eleM === 'number' ? { eleM: round(point.eleM, 1) } : {}),
            ...(typeof point.timeMs === 'number' ? { timeMs: point.timeMs } : {}),
        }
    })

    const sampledPoints = sampleTrackPoints(computedPoints, MAX_GPX_POINTS_STORED)
    const durationSec =
        typeof firstTimeMs === 'number' &&
        typeof lastTimeMs === 'number' &&
        lastTimeMs > firstTimeMs
            ? Math.round((lastTimeMs - firstTimeMs) / 1000)
            : Math.round(elapsedSecFallback)
    const distanceKm = round(totalDistanceM / 1000, 3)
    const avgPaceSecPerKm =
        distanceKm > 0 && durationSec > 0
            ? round(durationSec / distanceKm, 1)
            : undefined

    return {
        fileName: file.name || 'trace.gpx',
        uploadedAtMs: Date.now(),
        summary: {
            originalPointCount: computedPoints.length,
            storedPointCount: sampledPoints.length,
            distanceKm,
            durationSec: Math.max(0, durationSec),
            ...(typeof avgPaceSecPerKm === 'number' ? { avgPaceSecPerKm } : {}),
            ...(elevationGainM > 0 ? { elevationGainM: round(elevationGainM, 1) } : {}),
            ...(elevationLossM > 0 ? { elevationLossM: round(elevationLossM, 1) } : {}),
            ...(typeof minElevationM === 'number' ? { minElevationM: round(minElevationM, 1) } : {}),
            ...(typeof maxElevationM === 'number' ? { maxElevationM: round(maxElevationM, 1) } : {}),
        },
        points: sampledPoints,
    }
}

