import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Alert, Button, Card, Dialog, Spinner, Tag } from '@/components/ui'
import BodyCheckinForm, {
    type BodyCheckinFormValues,
    type PendingBodyCheckinPhoto,
} from '@/features/fitness/body/components/BodyCheckinForm'
import useBodyCheckins from '@/features/fitness/body/hooks/useBodyCheckins'
import { showFitnessErrorToast } from '@/features/fitness/common/utils/feedbackToast'
import {
    BODY_CHECKIN_FIELDS,
    createEmptyBodyCheckinValues,
    type BodyCheckin,
    type BodyCheckinFieldKey,
    type BodyCheckinInput,
    type BodyCheckinPhotoType,
} from '@/features/fitness/body/types/bodyCheckin'
import {
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlinePencil,
    HiOutlineRefresh,
    HiOutlineTrash,
} from 'react-icons/hi'

const MAX_PHOTOS_PER_CHECKIN = 3

type TimelineRange = '30' | '90' | '180' | 'all'

const timelineRangeLabel: Record<TimelineRange, string> = {
    '30': '30j',
    '90': '90j',
    '180': '6 mois',
    all: 'Tout',
}

const createEmptyFormValues = (): BodyCheckinFormValues => {
    const values = BODY_CHECKIN_FIELDS.reduce<Record<BodyCheckinFieldKey, string>>(
        (acc, field) => {
            acc[field.key] = ''
            return acc
        },
        {} as Record<BodyCheckinFieldKey, string>,
    )

    return {
        measuredAt: dayjs().format('YYYY-MM-DDTHH:mm'),
        unit: 'cm',
        weight: '',
        note: '',
        values,
    }
}

const toFormValues = (entry: BodyCheckin): BodyCheckinFormValues => {
    const values = BODY_CHECKIN_FIELDS.reduce<Record<BodyCheckinFieldKey, string>>(
        (acc, field) => {
            const current = entry.values[field.key]
            acc[field.key] = current === null ? '' : String(current)
            return acc
        },
        {} as Record<BodyCheckinFieldKey, string>,
    )

    return {
        measuredAt: entry.measuredAt
            ? dayjs(entry.measuredAt.toDate()).format('YYYY-MM-DDTHH:mm')
            : dayjs().format('YYYY-MM-DDTHH:mm'),
        unit: entry.unit,
        weight: typeof entry.weight === 'number' ? String(entry.weight) : '',
        note: entry.note || '',
        values,
    }
}

const getCheckinDate = (entry: BodyCheckin): Date | null => {
    const timestamp = entry.measuredAt ?? entry.updatedAt ?? entry.createdAt
    return timestamp ? timestamp.toDate() : null
}

const getCheckinDateLabel = (entry: BodyCheckin): string => {
    const date = getCheckinDate(entry)
    if (!date) {
        return 'Date indisponible'
    }

    return dayjs(date).format('DD/MM/YYYY HH:mm')
}

const photoTypeLabel: Record<BodyCheckinPhotoType, string> = {
    front: 'Face',
    side: 'Profil',
    back: 'Dos',
    other: 'Autre',
}

const buildInputFromForm = (values: BodyCheckinFormValues): BodyCheckinInput => {
    if (!values.measuredAt.trim()) {
        throw new Error('La date du check-in est requise.')
    }

    const measuredAt = new Date(values.measuredAt)
    if (Number.isNaN(measuredAt.getTime())) {
        throw new Error('La date du check-in est invalide.')
    }

    const normalizedValues = createEmptyBodyCheckinValues()
    BODY_CHECKIN_FIELDS.forEach((field) => {
        const rawValue = values.values[field.key].trim()
        if (!rawValue) {
            normalizedValues[field.key] = null
            return
        }

        const parsed = Number(rawValue)
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error(`La valeur "${field.label}" doit être positive.`)
        }
        normalizedValues[field.key] = parsed
    })

    const trimmedWeight = values.weight.trim()
    const parsedWeight = trimmedWeight ? Number(trimmedWeight) : undefined
    if (trimmedWeight && (!Number.isFinite(parsedWeight) || (parsedWeight as number) <= 0)) {
        throw new Error('Le poids doit être un nombre positif.')
    }

    return {
        measuredAt,
        unit: values.unit,
        values: normalizedValues,
        ...(typeof parsedWeight === 'number' ? { weight: parsedWeight } : {}),
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
    }
}

const getSummaryValues = (entry: BodyCheckin): string[] => {
    const keys: BodyCheckinFieldKey[] = ['waist', 'chest', 'hips']

    return keys
        .map((key) => {
            const field = BODY_CHECKIN_FIELDS.find((item) => item.key === key)
            const value = entry.values[key]
            if (!field || value === null) {
                return null
            }
            return `${field.label}: ${value} ${entry.unit}`
        })
        .filter((value): value is string => Boolean(value))
}

const revokePendingPhotos = (photos: PendingBodyCheckinPhoto[]) => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
}

const BodyCheckinsPage = () => {
    const {
        checkins,
        isLoading,
        isMutating,
        error,
        loadCheckins,
        addCheckin,
        editCheckin,
        removeCheckin,
    } = useBodyCheckins()

    const [createForm, setCreateForm] = useState<BodyCheckinFormValues>(createEmptyFormValues)
    const [createNewPhotos, setCreateNewPhotos] = useState<PendingBodyCheckinPhoto[]>([])

    const [detailEntry, setDetailEntry] = useState<BodyCheckin | null>(null)
    const [editingEntry, setEditingEntry] = useState<BodyCheckin | null>(null)
    const [editForm, setEditForm] = useState<BodyCheckinFormValues>(createEmptyFormValues)
    const [editRemovedPhotoPaths, setEditRemovedPhotoPaths] = useState<string[]>([])
    const [editNewPhotos, setEditNewPhotos] = useState<PendingBodyCheckinPhoto[]>([])
    const [entryToDelete, setEntryToDelete] = useState<BodyCheckin | null>(null)

    const [timelineRange, setTimelineRange] = useState<TimelineRange>('90')

    const createPhotosRef = useRef<PendingBodyCheckinPhoto[]>([])
    const editPhotosRef = useRef<PendingBodyCheckinPhoto[]>([])

    useEffect(() => {
        createPhotosRef.current = createNewPhotos
    }, [createNewPhotos])

    useEffect(() => {
        editPhotosRef.current = editNewPhotos
    }, [editNewPhotos])

    useEffect(() => {
        return () => {
            revokePendingPhotos(createPhotosRef.current)
            revokePendingPhotos(editPhotosRef.current)
        }
    }, [])

    const latestCheckin = useMemo(() => checkins[0] || null, [checkins])

    const timelineCheckins = useMemo(() => {
        if (timelineRange === 'all') {
            return checkins
        }

        const limitDate = dayjs().subtract(Number(timelineRange), 'day').startOf('day')

        return checkins.filter((entry) => {
            const date = getCheckinDate(entry)
            return date ? dayjs(date).isAfter(limitDate) : false
        })
    }, [checkins, timelineRange])


    const setCreateField = (
        field: 'measuredAt' | 'unit' | 'weight' | 'note',
        value: string,
    ) => {
        setCreateForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const setCreateMeasurementField = (field: BodyCheckinFieldKey, value: string) => {
        setCreateForm((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [field]: value,
            },
        }))
    }

    const setEditField = (
        field: 'measuredAt' | 'unit' | 'weight' | 'note',
        value: string,
    ) => {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const setEditMeasurementField = (field: BodyCheckinFieldKey, value: string) => {
        setEditForm((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [field]: value,
            },
        }))
    }

    const buildPendingPhoto = (
        type: BodyCheckinPhotoType,
        file: File,
    ): PendingBodyCheckinPhoto => {
        return {
            id: `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            type,
            file,
            previewUrl: URL.createObjectURL(file),
        }
    }

    const upsertNewPhoto = (
        currentPhotos: PendingBodyCheckinPhoto[],
        type: BodyCheckinPhotoType,
        file: File,
        existingPhotoCount: number,
    ): PendingBodyCheckinPhoto[] => {
        const found = currentPhotos.find((photo) => photo.type === type)
        const nextPhoto = buildPendingPhoto(type, file)

        if (found) {
            URL.revokeObjectURL(found.previewUrl)
            return currentPhotos.map((photo) =>
                photo.id === found.id ? nextPhoto : photo,
            )
        }

        if (existingPhotoCount + currentPhotos.length >= MAX_PHOTOS_PER_CHECKIN) {
            throw new Error('Maximum 3 photos par check-in.')
        }

        return [...currentPhotos, nextPhoto]
    }

    const handleAddCreatePhoto = (type: BodyCheckinPhotoType, file: File) => {
        try {
            setCreateNewPhotos((prev) => upsertNewPhoto(prev, type, file, 0))
        } catch (photoError) {
            showFitnessErrorToast(
                photoError instanceof Error
                    ? photoError.message
                    : 'Impossible d’ajouter cette photo.',
            )
        }
    }

    const handleAddEditPhoto = (type: BodyCheckinPhotoType, file: File) => {
        if (!editingEntry) {
            return
        }

        const existingActiveCount = editingEntry.photos.filter((photo) => {
            if (!photo.path) {
                return true
            }
            return !editRemovedPhotoPaths.includes(photo.path)
        }).length

        try {
            setEditNewPhotos((prev) =>
                upsertNewPhoto(prev, type, file, existingActiveCount),
            )
        } catch (photoError) {
            showFitnessErrorToast(
                photoError instanceof Error
                    ? photoError.message
                    : 'Impossible d’ajouter cette photo.',
            )
        }
    }

    const handleRemoveCreateNewPhoto = (id: string) => {
        setCreateNewPhotos((prev) => {
            const target = prev.find((photo) => photo.id === id)
            if (target) {
                URL.revokeObjectURL(target.previewUrl)
            }
            return prev.filter((photo) => photo.id !== id)
        })
    }

    const handleRemoveEditNewPhoto = (id: string) => {
        setEditNewPhotos((prev) => {
            const target = prev.find((photo) => photo.id === id)
            if (target) {
                URL.revokeObjectURL(target.previewUrl)
            }
            return prev.filter((photo) => photo.id !== id)
        })
    }

    const handleToggleEditExistingPhotoRemoval = (photoPath: string) => {
        setEditRemovedPhotoPaths((prev) => {
            if (prev.includes(photoPath)) {
                return prev.filter((path) => path !== photoPath)
            }
            return [...prev, photoPath]
        })
    }

    const handleCreateCheckin = async () => {
        try {
            const input = buildInputFromForm(createForm)
            await addCheckin(
                input,
                createNewPhotos.map((photo) => ({
                    type: photo.type,
                    file: photo.file,
                })),
            )
            revokePendingPhotos(createNewPhotos)
            setCreateNewPhotos([])
            setCreateForm(createEmptyFormValues())
        } catch (submitError) {
            showFitnessErrorToast(
                submitError instanceof Error
                    ? submitError.message
                    : 'Impossible d’enregistrer ce body check-in.',
            )
        }
    }

    const openEditDialog = (entry: BodyCheckin) => {
        revokePendingPhotos(editNewPhotos)
        setEditingEntry(entry)
        setEditForm(toFormValues(entry))
        setEditRemovedPhotoPaths([])
        setEditNewPhotos([])
    }

    const closeEditDialog = () => {
        if (isMutating) {
            return
        }

        revokePendingPhotos(editNewPhotos)
        setEditingEntry(null)
        setEditRemovedPhotoPaths([])
        setEditNewPhotos([])
    }

    const handleSaveEdit = async () => {
        if (!editingEntry) {
            return
        }

        try {
            const input = buildInputFromForm(editForm)
            await editCheckin({
                checkinId: editingEntry.id,
                input,
                existingPhotos: editingEntry.photos,
                removedPhotoPaths: editRemovedPhotoPaths,
                newPhotos: editNewPhotos.map((photo) => ({
                    type: photo.type,
                    file: photo.file,
                })),
            })
            closeEditDialog()
        } catch (submitError) {
            showFitnessErrorToast(
                submitError instanceof Error
                    ? submitError.message
                    : 'Impossible de mettre à jour ce body check-in.',
            )
        }
    }

    const handleDeleteCheckin = async () => {
        if (!entryToDelete) {
            return
        }

        try {
            await removeCheckin(entryToDelete.id)
            setEntryToDelete(null)
        } catch {
            // Error toast handled by hook.
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Corps
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Body Check-ins</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                        Regroupe mensurations, poids et photos dans un snapshot daté pour visualiser ton évolution plus facilement.
                    </p>
                </div>
                <Button
                    size="sm"
                    icon={<HiOutlineRefresh />}
                    onClick={loadCheckins}
                    disabled={isLoading || isMutating}
                >
                    Rafraîchir
                </Button>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                <p className="font-semibold">Nouveau check-in</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Un snapshot complet daté de ton état corporel du moment.
                </p>
                <div className="mt-4">
                    <BodyCheckinForm
                        values={createForm}
                        newPhotos={createNewPhotos}
                        disabled={isMutating}
                        onFieldChange={setCreateField}
                        onMeasurementValueChange={setCreateMeasurementField}
                        onAddPhoto={handleAddCreatePhoto}
                        onRemoveNewPhoto={handleRemoveCreateNewPhoto}
                        onToggleRemoveExistingPhoto={() => undefined}
                    />
                </div>
                <div className="mt-3 flex justify-end">
                    <Button variant="solid" loading={isMutating} onClick={handleCreateCheckin}>
                        Enregistrer le check-in
                    </Button>
                </div>
            </Card>

            {latestCheckin && (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Dernier check-in</p>
                            <p className="mt-1 text-base font-semibold">{getCheckinDateLabel(latestCheckin)}</p>
                            {typeof latestCheckin.weight === 'number' && (
                                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                                    Poids: {latestCheckin.weight}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {getSummaryValues(latestCheckin).map((summary) => (
                                <Tag
                                    key={summary}
                                    className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
                                >
                                    {summary}
                                </Tag>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            <Card
                header={
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Timeline des body check-ins</span>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(timelineRangeLabel) as TimelineRange[]).map((range) => (
                                <Button
                                    key={range}
                                    size="xs"
                                    variant={timelineRange === range ? 'solid' : 'default'}
                                    onClick={() => setTimelineRange(range)}
                                >
                                    {timelineRangeLabel[range]}
                                </Button>
                            ))}
                        </div>
                    </div>
                }
            >
                {isLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                ) : timelineCheckins.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {checkins.length === 0
                                ? 'Aucun body check-in pour le moment.'
                                : 'Aucun check-in dans cette période.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {timelineCheckins.map((entry) => (
                            <div
                                key={entry.id}
                                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-base font-semibold">{getCheckinDateLabel(entry)}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="inline-flex items-center gap-1">
                                                <HiOutlineCalendar />
                                                Unité: {entry.unit}
                                            </span>
                                            {entry.updatedAt && (
                                                <span className="inline-flex items-center gap-1">
                                                    <HiOutlineClock />
                                                    Mis à jour le {dayjs(entry.updatedAt.toDate()).format('DD/MM/YYYY HH:mm')}
                                                </span>
                                            )}
                                        </div>

                                        {typeof entry.weight === 'number' && (
                                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                                Poids: {entry.weight}
                                            </p>
                                        )}

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {getSummaryValues(entry).length > 0 ? (
                                                getSummaryValues(entry).map((summary) => (
                                                    <Tag
                                                        key={summary}
                                                        className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                                                    >
                                                        {summary}
                                                    </Tag>
                                                ))
                                            ) : (
                                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    Peu de mensurations renseignées
                                                </Tag>
                                            )}
                                        </div>

                                        {entry.note && (
                                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                                {entry.note}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        {entry.photos[0] && (
                                            <img
                                                src={entry.photos[0].url}
                                                alt={`Aperçu ${photoTypeLabel[entry.photos[0].type]}`}
                                                className="h-20 w-20 rounded object-cover"
                                            />
                                        )}
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                size="xs"
                                                icon={<HiOutlineEye />}
                                                onClick={() => setDetailEntry(entry)}
                                                disabled={isMutating}
                                            >
                                                Détail
                                            </Button>
                                            <Button
                                                size="xs"
                                                icon={<HiOutlinePencil />}
                                                onClick={() => openEditDialog(entry)}
                                                disabled={isMutating}
                                            >
                                                Modifier
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant="twoTone"
                                                icon={<HiOutlineTrash />}
                                                onClick={() => setEntryToDelete(entry)}
                                                disabled={isMutating}
                                            >
                                                Supprimer
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Dialog
                width={860}
                isOpen={Boolean(editingEntry)}
                onClose={closeEditDialog}
                onRequestClose={closeEditDialog}
            >
                <div className="px-6 py-5">
                    <h5>Modifier le body check-in</h5>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Ajuste les mesures, le poids, les photos et la note si besoin.
                    </p>
                    <div className="mt-4">
                        <BodyCheckinForm
                            values={editForm}
                            existingPhotos={editingEntry?.photos || []}
                            removedPhotoPaths={editRemovedPhotoPaths}
                            newPhotos={editNewPhotos}
                            disabled={isMutating}
                            onFieldChange={setEditField}
                            onMeasurementValueChange={setEditMeasurementField}
                            onAddPhoto={handleAddEditPhoto}
                            onRemoveNewPhoto={handleRemoveEditNewPhoto}
                            onToggleRemoveExistingPhoto={handleToggleEditExistingPhotoRemoval}
                        />
                    </div>
                </div>

                <div className="rounded-b-lg bg-gray-100 px-6 py-3 text-right dark:bg-gray-700">
                    <Button className="ltr:mr-2 rtl:ml-2" size="sm" onClick={closeEditDialog}>
                        Annuler
                    </Button>
                    <Button size="sm" variant="solid" loading={isMutating} onClick={handleSaveEdit}>
                        Enregistrer
                    </Button>
                </div>
            </Dialog>

            <Dialog
                width={900}
                isOpen={Boolean(detailEntry)}
                onClose={() => setDetailEntry(null)}
                onRequestClose={() => setDetailEntry(null)}
            >
                <div className="px-6 py-5">
                    <h5>Détail du body check-in</h5>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {detailEntry ? getCheckinDateLabel(detailEntry) : ''}
                    </p>

                    {detailEntry && (
                        <>
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {BODY_CHECKIN_FIELDS.map((field) => (
                                    <Card key={field.key}>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {field.label}
                                        </p>
                                        <p className="mt-1 font-semibold">
                                            {detailEntry.values[field.key] === null
                                                ? '—'
                                                : `${detailEntry.values[field.key]} ${detailEntry.unit}`}
                                        </p>
                                    </Card>
                                ))}
                            </div>

                            {(typeof detailEntry.weight === 'number' || detailEntry.note) && (
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {typeof detailEntry.weight === 'number' && (
                                        <Card>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Poids</p>
                                            <p className="mt-1 font-semibold">{detailEntry.weight}</p>
                                        </Card>
                                    )}
                                    {detailEntry.note && (
                                        <Card>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Note</p>
                                            <p className="mt-1 text-sm">{detailEntry.note}</p>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {detailEntry.photos.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-semibold">Photos</p>
                                    <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {detailEntry.photos.map((photo) => (
                                            <div
                                                key={photo.path || `${photo.type}-${photo.url}`}
                                                className="rounded-xl border border-gray-200 p-2 dark:border-gray-700"
                                            >
                                                <img
                                                    src={photo.url}
                                                    alt={`Photo ${photoTypeLabel[photo.type]}`}
                                                    className="h-44 w-full rounded object-cover"
                                                />
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {photoTypeLabel[photo.type]}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="rounded-b-lg bg-gray-100 px-6 py-3 text-right dark:bg-gray-700">
                    <Button size="sm" onClick={() => setDetailEntry(null)}>
                        Fermer
                    </Button>
                </div>
            </Dialog>

            <ConfirmDialog
                isOpen={Boolean(entryToDelete)}
                type="danger"
                title="Supprimer ce body check-in ?"
                confirmText="Supprimer"
                cancelText="Annuler"
                onClose={() => setEntryToDelete(null)}
                onRequestClose={() => setEntryToDelete(null)}
                onCancel={() => setEntryToDelete(null)}
                onConfirm={handleDeleteCheckin}
            >
                <p>Cette action supprime définitivement les données et les photos associées.</p>
            </ConfirmDialog>
        </div>
    )
}

export default BodyCheckinsPage
