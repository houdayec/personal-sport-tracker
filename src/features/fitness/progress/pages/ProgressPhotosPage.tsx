import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Alert, Button, Card, Input, Spinner, Tag } from '@/components/ui'
import useBodyCheckins from '@/features/fitness/body/hooks/useBodyCheckins'
import {
    BODY_CHECKIN_FIELDS,
    type BodyCheckin,
    type BodyCheckinFieldKey,
    type BodyCheckinPhoto,
    type BodyCheckinPhotoType,
} from '@/features/fitness/body/types/bodyCheckin'
import { HiOutlineRefresh } from 'react-icons/hi'

type ComparisonPreset = 'previous' | '30' | '90' | 'start'

const photoTypeLabel: Record<BodyCheckinPhotoType, string> = {
    front: 'Face',
    side: 'Profil',
    back: 'Dos',
    other: 'Autre',
}

const getCheckinDate = (entry: BodyCheckin): Date | null => {
    const timestamp = entry.measuredAt ?? entry.updatedAt ?? entry.createdAt
    return timestamp ? timestamp.toDate() : null
}

const getCheckinDateMs = (entry: BodyCheckin): number => {
    const date = getCheckinDate(entry)
    return date ? date.getTime() : 0
}

const getCheckinDateLabel = (entry: BodyCheckin): string => {
    const date = getCheckinDate(entry)
    if (!date) {
        return 'Date indisponible'
    }

    return dayjs(date).format('DD/MM/YYYY HH:mm')
}

const getPhotoByType = (
    entry: BodyCheckin | null,
    photoType: BodyCheckinPhotoType,
): BodyCheckinPhoto | null => {
    if (!entry || entry.photos.length === 0) {
        return null
    }

    return entry.photos.find((photo) => photo.type === photoType) || entry.photos[0] || null
}

const formatDelta = (delta: number, decimals = 1): string => {
    const rounded = Number(delta.toFixed(decimals))
    if (rounded > 0) {
        return `+${rounded}`
    }
    return `${rounded}`
}

const deltaTagClass = (delta: number): string => {
    if (delta > 0) {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
    }
    if (delta < 0) {
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100'
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
}

const ProgressPhotosPage = () => {
    const { checkins, isLoading, error, loadCheckins } = useBodyCheckins()

    const [comparisonPhotoType, setComparisonPhotoType] =
        useState<BodyCheckinPhotoType>('front')
    const [comparisonBeforeId, setComparisonBeforeId] = useState('')
    const [comparisonAfterId, setComparisonAfterId] = useState('')
    const [comparisonSlider, setComparisonSlider] = useState(50)

    useEffect(() => {
        if (checkins.length === 0) {
            setComparisonBeforeId('')
            setComparisonAfterId('')
            return
        }

        const ids = new Set(checkins.map((item) => item.id))
        const nextAfter = ids.has(comparisonAfterId) ? comparisonAfterId : checkins[0].id
        let nextBefore = ids.has(comparisonBeforeId)
            ? comparisonBeforeId
            : (checkins[1]?.id || checkins[0].id)

        if (nextBefore === nextAfter) {
            const fallbackBefore = checkins.find((item) => item.id !== nextAfter)
            nextBefore = fallbackBefore ? fallbackBefore.id : nextBefore
        }

        if (nextAfter !== comparisonAfterId) {
            setComparisonAfterId(nextAfter)
        }
        if (nextBefore !== comparisonBeforeId) {
            setComparisonBeforeId(nextBefore)
        }
    }, [checkins, comparisonAfterId, comparisonBeforeId])

    const comparisonBefore = useMemo(() => {
        return checkins.find((entry) => entry.id === comparisonBeforeId) || null
    }, [checkins, comparisonBeforeId])

    const comparisonAfter = useMemo(() => {
        return checkins.find((entry) => entry.id === comparisonAfterId) || null
    }, [checkins, comparisonAfterId])

    const comparisonBeforePhoto = useMemo(() => {
        return getPhotoByType(comparisonBefore, comparisonPhotoType)
    }, [comparisonBefore, comparisonPhotoType])

    const comparisonAfterPhoto = useMemo(() => {
        return getPhotoByType(comparisonAfter, comparisonPhotoType)
    }, [comparisonAfter, comparisonPhotoType])

    const comparisonPairValid = Boolean(
        comparisonBefore && comparisonAfter && comparisonBefore.id !== comparisonAfter.id,
    )

    const hasComparisonPhotos = Boolean(comparisonBeforePhoto && comparisonAfterPhoto)

    const comparisonDayGap = useMemo(() => {
        if (!comparisonBefore || !comparisonAfter) {
            return null
        }
        const beforeDate = getCheckinDate(comparisonBefore)
        const afterDate = getCheckinDate(comparisonAfter)
        if (!beforeDate || !afterDate) {
            return null
        }

        return Math.abs(dayjs(afterDate).diff(dayjs(beforeDate), 'day'))
    }, [comparisonAfter, comparisonBefore])

    const comparisonDeltas = useMemo(() => {
        if (!comparisonBefore || !comparisonAfter || !comparisonPairValid) {
            return [] as Array<{ label: string; text: string; delta: number }>
        }

        const deltas: Array<{ label: string; text: string; delta: number }> = []

        if (
            typeof comparisonBefore.weight === 'number' &&
            typeof comparisonAfter.weight === 'number'
        ) {
            const delta = comparisonAfter.weight - comparisonBefore.weight
            deltas.push({
                label: 'Poids',
                text: `${formatDelta(delta, 1)} kg`,
                delta,
            })
        }

        if (comparisonBefore.unit === comparisonAfter.unit) {
            ;(['waist', 'chest', 'hips'] as BodyCheckinFieldKey[]).forEach((key) => {
                const beforeValue = comparisonBefore.values[key]
                const afterValue = comparisonAfter.values[key]

                if (typeof beforeValue !== 'number' || typeof afterValue !== 'number') {
                    return
                }

                const field = BODY_CHECKIN_FIELDS.find((item) => item.key === key)
                if (!field) {
                    return
                }

                const delta = afterValue - beforeValue
                deltas.push({
                    label: field.label,
                    text: `${formatDelta(delta, 1)} ${comparisonAfter.unit}`,
                    delta,
                })
            })
        }

        return deltas
    }, [comparisonAfter, comparisonBefore, comparisonPairValid])

    const applyComparisonPreset = (preset: ComparisonPreset) => {
        if (checkins.length < 2) {
            return
        }

        const newest = checkins[0]
        const newestDateMs = getCheckinDateMs(newest)
        let older = checkins[1] || checkins[0]

        if (preset === 'start') {
            older = checkins[checkins.length - 1]
        }

        if (preset === '30' || preset === '90') {
            const days = Number(preset)
            const targetMs = dayjs(newestDateMs).subtract(days, 'day').valueOf()
            older =
                checkins.find((entry) => getCheckinDateMs(entry) <= targetMs) ||
                checkins[checkins.length - 1]
        }

        setComparisonAfterId(newest.id)
        setComparisonBeforeId(older.id)
        setComparisonSlider(50)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Progression
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Comparaison photos</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                        Compare deux check-ins sur le même angle pour visualiser l’évolution réelle.
                    </p>
                </div>
                <Button size="sm" icon={<HiOutlineRefresh />} onClick={loadCheckins} disabled={isLoading}>
                    Rafraîchir
                </Button>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            {isLoading ? (
                <Card>
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                </Card>
            ) : (
                <>
                    <Card>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold">Comparateur avant / après</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Choisis deux dates, un angle, puis utilise le slider pour comparer visuellement.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button size="xs" onClick={() => applyComparisonPreset('previous')}>
                                    Dernier vs précédent
                                </Button>
                                <Button size="xs" onClick={() => applyComparisonPreset('30')}>
                                    Dernier vs 30j
                                </Button>
                                <Button size="xs" onClick={() => applyComparisonPreset('90')}>
                                    Dernier vs 90j
                                </Button>
                                <Button size="xs" onClick={() => applyComparisonPreset('start')}>
                                    Dernier vs début
                                </Button>
                            </div>
                        </div>

                        {checkins.length < 2 ? (
                            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                                Ajoute au moins deux body check-ins pour activer la comparaison.
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="grid gap-3 lg:grid-cols-3">
                                    <div>
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Angle photo
                                        </p>
                                        <Input
                                            asElement="select"
                                            value={comparisonPhotoType}
                                            onChange={(event) =>
                                                setComparisonPhotoType(event.target.value as BodyCheckinPhotoType)
                                            }
                                        >
                                            <option value="front">Face</option>
                                            <option value="side">Profil</option>
                                            <option value="back">Dos</option>
                                            <option value="other">Autre</option>
                                        </Input>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Avant (date ancienne)
                                        </p>
                                        <Input
                                            asElement="select"
                                            value={comparisonBeforeId}
                                            onChange={(event) => setComparisonBeforeId(event.target.value)}
                                        >
                                            {checkins.map((entry) => (
                                                <option key={`before_${entry.id}`} value={entry.id}>
                                                    {getCheckinDateLabel(entry)}
                                                </option>
                                            ))}
                                        </Input>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Après (date récente)
                                        </p>
                                        <Input
                                            asElement="select"
                                            value={comparisonAfterId}
                                            onChange={(event) => setComparisonAfterId(event.target.value)}
                                        >
                                            {checkins.map((entry) => (
                                                <option key={`after_${entry.id}`} value={entry.id}>
                                                    {getCheckinDateLabel(entry)}
                                                </option>
                                            ))}
                                        </Input>
                                    </div>
                                </div>

                                {!comparisonPairValid ? (
                                    <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                                        Choisis deux check-ins différents pour comparer.
                                    </div>
                                ) : !hasComparisonPhotos ? (
                                    <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                                        Impossible de comparer cet angle: ajoute une photo “{photoTypeLabel[comparisonPhotoType]}” sur les deux dates sélectionnées.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
                                        <div>
                                            <div className="relative mx-auto aspect-[3/4] max-w-[420px] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                                                {comparisonBeforePhoto && (
                                                    <img
                                                        src={comparisonBeforePhoto.url}
                                                        alt="Avant"
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                                {comparisonAfterPhoto && (
                                                    <div
                                                        className="absolute inset-y-0 left-0 overflow-hidden"
                                                        style={{ width: `${comparisonSlider}%` }}
                                                    >
                                                        <img
                                                            src={comparisonAfterPhoto.url}
                                                            alt="Après"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div
                                                    className="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
                                                    style={{ left: `calc(${comparisonSlider}% - 1px)` }}
                                                />
                                            </div>
                                            <div className="mt-3 px-1">
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    value={comparisonSlider}
                                                    onChange={(event) =>
                                                        setComparisonSlider(Number(event.target.value))
                                                    }
                                                    className="w-full"
                                                />
                                                <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                    <span>Avant</span>
                                                    <span>Après</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Card>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Avant</p>
                                                <p className="mt-1 font-semibold">
                                                    {comparisonBefore ? getCheckinDateLabel(comparisonBefore) : '—'}
                                                </p>
                                            </Card>
                                            <Card>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Après</p>
                                                <p className="mt-1 font-semibold">
                                                    {comparisonAfter ? getCheckinDateLabel(comparisonAfter) : '—'}
                                                </p>
                                            </Card>

                                            {comparisonDayGap !== null && (
                                                <Card>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Écart entre les deux check-ins
                                                    </p>
                                                    <p className="mt-1 text-lg font-semibold">
                                                        {comparisonDayGap} jour{comparisonDayGap > 1 ? 's' : ''}
                                                    </p>
                                                </Card>
                                            )}

                                            <Card>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Variations contextuelles
                                                </p>
                                                {comparisonDeltas.length === 0 ? (
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                        Données insuffisantes pour calculer les deltas (vérifie poids / taille / poitrine / hanches).
                                                    </p>
                                                ) : (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {comparisonDeltas.map((item) => (
                                                            <Tag key={item.label} className={deltaTagClass(item.delta)}>
                                                                {item.label}: {item.text}
                                                            </Tag>
                                                        ))}
                                                    </div>
                                                )}
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    <Card>
                        <p className="font-semibold">Conseils de prise photo</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Pour une comparaison propre: même lumière, même distance, même posture.
                        </p>
                        <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                            <p>1. Positionne le téléphone au même endroit (idéalement sur trépied).</p>
                            <p>2. Garde le même cadrage (tête à pieds) et le même angle.</p>
                            <p>3. Prends les photos au même moment de la journée.</p>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}

export default ProgressPhotosPage
