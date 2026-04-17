import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    Alert,
    Button,
    Card,
    Dialog,
    Spinner,
    Tag,
} from '@/components/ui'
import BodyMeasurementSnapshotForm, {
    type BodyMeasurementSnapshotFormValues,
} from '@/features/fitness/body/components/BodyMeasurementSnapshotForm'
import useBodyMeasurementEntries from '@/features/fitness/body/hooks/useBodyMeasurementEntries'
import {
    BODY_MEASUREMENT_FIELDS,
    createEmptyBodyMeasurementValues,
    type BodyMeasurementEntry,
    type BodyMeasurementEntryInput,
    type BodyMeasurementFieldKey,
} from '@/features/fitness/body/types/bodyMeasurement'
import {
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlinePencil,
    HiOutlineRefresh,
    HiOutlineTrash,
} from 'react-icons/hi'

const createEmptyMeasurementFormValues = (): Record<BodyMeasurementFieldKey, string> => {
    return BODY_MEASUREMENT_FIELDS.reduce<Record<BodyMeasurementFieldKey, string>>(
        (acc, field) => {
            acc[field.key] = ''
            return acc
        },
        {} as Record<BodyMeasurementFieldKey, string>,
    )
}

const createDefaultFormValues = (): BodyMeasurementSnapshotFormValues => ({
    measuredAt: dayjs().format('YYYY-MM-DDTHH:mm'),
    unit: 'cm',
    note: '',
    values: createEmptyMeasurementFormValues(),
})

const formatSnapshotDate = (entry: BodyMeasurementEntry): string => {
    const date = entry.measuredAt ?? entry.createdAt ?? entry.updatedAt

    if (!date) {
        return 'Date indisponible'
    }

    return dayjs(date.toDate()).format('DD/MM/YYYY HH:mm')
}

const toFormValues = (entry: BodyMeasurementEntry): BodyMeasurementSnapshotFormValues => {
    const measurementValues = createEmptyMeasurementFormValues()

    BODY_MEASUREMENT_FIELDS.forEach((field) => {
        const value = entry.values[field.key]
        measurementValues[field.key] = value === null ? '' : String(value)
    })

    return {
        measuredAt: entry.measuredAt
            ? dayjs(entry.measuredAt.toDate()).format('YYYY-MM-DDTHH:mm')
            : dayjs().format('YYYY-MM-DDTHH:mm'),
        unit: entry.unit,
        note: entry.note || '',
        values: measurementValues,
    }
}

const buildInputFromForm = (
    values: BodyMeasurementSnapshotFormValues,
): BodyMeasurementEntryInput => {
    if (!values.measuredAt.trim()) {
        throw new Error('La date de mesure est requise.')
    }

    const measuredAt = new Date(values.measuredAt)

    if (Number.isNaN(measuredAt.getTime())) {
        throw new Error('La date de mesure est invalide.')
    }

    const normalizedValues = createEmptyBodyMeasurementValues()

    BODY_MEASUREMENT_FIELDS.forEach((field) => {
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

    return {
        measuredAt,
        unit: values.unit,
        values: normalizedValues,
        note: values.note.trim() || undefined,
    }
}

const getSummaryValues = (entry: BodyMeasurementEntry): string[] => {
    const trackedKeys: BodyMeasurementFieldKey[] = ['waist', 'chest', 'hips']

    return trackedKeys
        .map((key) => {
            const field = BODY_MEASUREMENT_FIELDS.find((item) => item.key === key)
            const value = entry.values[key]

            if (!field || value === null) {
                return null
            }

            return `${field.label}: ${value} ${entry.unit}`
        })
        .filter((value): value is string => Boolean(value))
}

const BodyMeasurementsPage = () => {
    const {
        entries,
        isLoading,
        isMutating,
        error,
        loadEntries,
        addEntry,
        editEntry,
        removeEntry,
    } = useBodyMeasurementEntries()

    const [createForm, setCreateForm] = useState<BodyMeasurementSnapshotFormValues>(
        createDefaultFormValues,
    )
    const [createError, setCreateError] = useState<string | null>(null)

    const [detailEntry, setDetailEntry] = useState<BodyMeasurementEntry | null>(null)

    const [editingEntry, setEditingEntry] = useState<BodyMeasurementEntry | null>(null)
    const [editForm, setEditForm] = useState<BodyMeasurementSnapshotFormValues>(
        createDefaultFormValues,
    )
    const [editError, setEditError] = useState<string | null>(null)

    const [entryToDelete, setEntryToDelete] = useState<BodyMeasurementEntry | null>(null)

    const latestEntry = useMemo(() => entries[0] || null, [entries])

    const updateCreateField = (
        field: 'measuredAt' | 'unit' | 'note',
        value: string,
    ) => {
        setCreateForm((prev) => ({
            ...prev,
            [field]: value,
        }))

        if (createError) {
            setCreateError(null)
        }
    }

    const updateCreateMeasurementValue = (
        field: BodyMeasurementFieldKey,
        value: string,
    ) => {
        setCreateForm((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [field]: value,
            },
        }))

        if (createError) {
            setCreateError(null)
        }
    }

    const updateEditField = (
        field: 'measuredAt' | 'unit' | 'note',
        value: string,
    ) => {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }))

        if (editError) {
            setEditError(null)
        }
    }

    const updateEditMeasurementValue = (
        field: BodyMeasurementFieldKey,
        value: string,
    ) => {
        setEditForm((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [field]: value,
            },
        }))

        if (editError) {
            setEditError(null)
        }
    }

    const handleCreateSnapshot = async () => {
        try {
            setCreateError(null)
            const input = buildInputFromForm(createForm)
            await addEntry(input)
            setCreateForm(createDefaultFormValues())
        } catch (submitError) {
            if (submitError instanceof Error && submitError.message) {
                setCreateError(submitError.message)
            } else {
                setCreateError('Une erreur est survenue. Merci de réessayer.')
            }
        }
    }

    const openEditDialog = (entry: BodyMeasurementEntry) => {
        setEditingEntry(entry)
        setEditForm(toFormValues(entry))
        setEditError(null)
    }

    const closeEditDialog = () => {
        if (isMutating) {
            return
        }

        setEditingEntry(null)
    }

    const handleEditSnapshot = async () => {
        if (!editingEntry) {
            return
        }

        try {
            setEditError(null)
            const input = buildInputFromForm(editForm)
            await editEntry(editingEntry.id, input)
            setEditingEntry(null)
        } catch (submitError) {
            if (submitError instanceof Error && submitError.message) {
                setEditError(submitError.message)
            } else {
                setEditError('Une erreur est survenue. Merci de réessayer.')
            }
        }
    }

    const handleDeleteSnapshot = async () => {
        if (!entryToDelete) {
            return
        }

        try {
            await removeEntry(entryToDelete.id)
            setEntryToDelete(null)
        } catch {
            // Error already handled in hook state.
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Corps
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Mensurations</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Chaque entrée est un snapshot complet daté stocké dans
                    <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                        users/{'{uid}'}/body_measurement_entries
                    </code>
                    .
                </p>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="font-semibold">Nouveau snapshot</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Une prise complète en une seule entrée.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        icon={<HiOutlineRefresh />}
                        onClick={loadEntries}
                        disabled={isLoading || isMutating}
                    >
                        Rafraîchir
                    </Button>
                </div>

                {createError && (
                    <Alert className="mt-4" type="danger" showIcon>
                        {createError}
                    </Alert>
                )}

                <div className="mt-4">
                    <BodyMeasurementSnapshotForm
                        values={createForm}
                        disabled={isMutating}
                        onFieldChange={updateCreateField}
                        onMeasurementValueChange={updateCreateMeasurementValue}
                    />
                </div>

                <div className="mt-2 flex justify-end">
                    <Button
                        variant="solid"
                        loading={isMutating}
                        onClick={handleCreateSnapshot}
                    >
                        Enregistrer le snapshot
                    </Button>
                </div>
            </Card>

            {latestEntry && (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Dernier snapshot</p>
                            <p className="mt-1 font-semibold">{formatSnapshotDate(latestEntry)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {getSummaryValues(latestEntry).map((summary) => (
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

            <Card header="Historique des snapshots">
                {isLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucun snapshot enregistré pour le moment.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-base font-semibold">
                                            Snapshot du {formatSnapshotDate(entry)}
                                        </p>

                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="inline-flex items-center gap-1">
                                                <HiOutlineCalendar />
                                                Unité: {entry.unit}
                                            </span>
                                            {entry.updatedAt && (
                                                <span className="inline-flex items-center gap-1">
                                                    <HiOutlineClock />
                                                    Mis à jour le{' '}
                                                    {dayjs(entry.updatedAt.toDate()).format(
                                                        'DD/MM/YYYY HH:mm',
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
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
                                                    Aucune valeur principale
                                                </Tag>
                                            )}
                                        </div>

                                        {entry.note && (
                                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                                {entry.note}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
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
                        ))}
                    </div>
                )}
            </Card>

            <Dialog
                width={700}
                isOpen={Boolean(detailEntry)}
                onClose={() => setDetailEntry(null)}
                onRequestClose={() => setDetailEntry(null)}
            >
                <div className="px-6 py-5">
                    <h5>Détail du snapshot</h5>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {detailEntry ? formatSnapshotDate(detailEntry) : ''}
                    </p>

                    {detailEntry && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {BODY_MEASUREMENT_FIELDS.map((field) => (
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
                    )}

                    {detailEntry?.note && (
                        <Card className="mt-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Note</p>
                            <p className="mt-1 text-sm">{detailEntry.note}</p>
                        </Card>
                    )}
                </div>

                <div className="rounded-b-lg bg-gray-100 px-6 py-3 text-right dark:bg-gray-700">
                    <Button size="sm" onClick={() => setDetailEntry(null)}>
                        Fermer
                    </Button>
                </div>
            </Dialog>

            <Dialog
                width={760}
                isOpen={Boolean(editingEntry)}
                onClose={closeEditDialog}
                onRequestClose={closeEditDialog}
            >
                <div className="px-6 py-5">
                    <h5>Modifier le snapshot</h5>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Ajuste les valeurs mesurées si nécessaire.
                    </p>

                    {editError && (
                        <Alert className="mt-4" type="danger" showIcon>
                            {editError}
                        </Alert>
                    )}

                    <div className="mt-4">
                        <BodyMeasurementSnapshotForm
                            values={editForm}
                            disabled={isMutating}
                            onFieldChange={updateEditField}
                            onMeasurementValueChange={updateEditMeasurementValue}
                        />
                    </div>
                </div>

                <div className="rounded-b-lg bg-gray-100 px-6 py-3 text-right dark:bg-gray-700">
                    <Button
                        className="ltr:mr-2 rtl:ml-2"
                        size="sm"
                        onClick={closeEditDialog}
                    >
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        loading={isMutating}
                        onClick={handleEditSnapshot}
                    >
                        Enregistrer
                    </Button>
                </div>
            </Dialog>

            <ConfirmDialog
                isOpen={Boolean(entryToDelete)}
                type="danger"
                title="Supprimer ce snapshot ?"
                confirmText="Supprimer"
                cancelText="Annuler"
                onClose={() => setEntryToDelete(null)}
                onRequestClose={() => setEntryToDelete(null)}
                onCancel={() => setEntryToDelete(null)}
                onConfirm={handleDeleteSnapshot}
            >
                <p>Le snapshot sera supprimé de l’historique.</p>
            </ConfirmDialog>
        </div>
    )
}

export default BodyMeasurementsPage
