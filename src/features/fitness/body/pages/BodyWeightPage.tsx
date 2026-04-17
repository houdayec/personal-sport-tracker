import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Dialog,
    FormContainer,
    FormItem,
    Input,
    Spinner,
    Tag,
} from '@/components/ui'
import { showFitnessErrorToast } from '@/features/fitness/common/utils/feedbackToast'
import useBodyWeightEntries from '@/features/fitness/body/hooks/useBodyWeightEntries'
import {
    BODY_WEIGHT_UNITS,
    type BodyWeightEntry,
    type BodyWeightEntryInput,
    type BodyWeightUnit,
} from '@/features/fitness/body/types/bodyWeight'
import {
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineChevronDown,
    HiOutlinePencil,
    HiOutlineTrash,
} from 'react-icons/hi'

interface BodyWeightFormValues {
    measuredAt: string
    weight: string
    unit: BodyWeightUnit
    note: string
}

const UNIT_LABELS: Record<BodyWeightUnit, string> = {
    kg: 'kg',
    lb: 'lb',
}

const DATE_TIME_STORAGE_FORMAT = 'YYYY-MM-DDTHH:mm'

const toDateTimeStorageValue = (value: Date): string =>
    dayjs(value).format(DATE_TIME_STORAGE_FORMAT)

const fromDateTimeStorageValue = (value: string): Date | null => {
    if (!value.trim()) {
        return null
    }

    const parsed = dayjs(value, DATE_TIME_STORAGE_FORMAT, true)
    return parsed.isValid() ? parsed.toDate() : null
}

const defaultFormValues = (): BodyWeightFormValues => ({
    measuredAt: dayjs().format(DATE_TIME_STORAGE_FORMAT),
    weight: '',
    unit: 'kg',
    note: '',
})

const toFormValues = (entry: BodyWeightEntry): BodyWeightFormValues => ({
    measuredAt: entry.measuredAt
        ? dayjs(entry.measuredAt.toDate()).format(DATE_TIME_STORAGE_FORMAT)
        : dayjs().format(DATE_TIME_STORAGE_FORMAT),
    weight: String(entry.weight),
    unit: entry.unit,
    note: entry.note || '',
})

const formatEntryDate = (entry: BodyWeightEntry): string => {
    const date = entry.measuredAt ?? entry.createdAt ?? entry.updatedAt

    if (!date) {
        return 'Date indisponible'
    }

    return dayjs(date.toDate()).format('DD/MM/YYYY HH:mm')
}

const buildInputFromForm = (values: BodyWeightFormValues): BodyWeightEntryInput => {
    const parsedWeight = Number(values.weight)

    if (!values.measuredAt.trim()) {
        throw new Error('La date de mesure est requise.')
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        throw new Error('Le poids doit être un nombre positif.')
    }

    const measuredAt = new Date(values.measuredAt)

    if (Number.isNaN(measuredAt.getTime())) {
        throw new Error('La date de mesure est invalide.')
    }

    const trimmedUnit = values.unit.trim() as BodyWeightUnit

    if (!(BODY_WEIGHT_UNITS as readonly string[]).includes(trimmedUnit)) {
        throw new Error('L’unité est invalide.')
    }

    return {
        measuredAt,
        weight: parsedWeight,
        unit: trimmedUnit,
        note: values.note.trim() || undefined,
    }
}

const BodyWeightPage = () => {
    const {
        entries,
        isLoading,
        isMutating,
        error,
        addEntry,
        editEntry,
        removeEntry,
    } = useBodyWeightEntries()

    const [quickForm, setQuickForm] = useState<BodyWeightFormValues>(defaultFormValues)
    const [editingEntry, setEditingEntry] = useState<BodyWeightEntry | null>(null)
    const [editForm, setEditForm] = useState<BodyWeightFormValues>(defaultFormValues)

    const [entryToDelete, setEntryToDelete] = useState<BodyWeightEntry | null>(null)

    const latestEntry = useMemo(() => entries[0] || null, [entries])

    const scrollToHistory = () => {
        const section = document.getElementById('body-weight-history')
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const setQuickField = (field: keyof BodyWeightFormValues, value: string) => {
        setQuickForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const setEditField = (field: keyof BodyWeightFormValues, value: string) => {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleQuickSubmit = async () => {
        try {
            const input = buildInputFromForm(quickForm)
            await addEntry(input)
            setQuickForm(defaultFormValues())
        } catch (submitError) {
            if (submitError instanceof Error && submitError.message) {
                showFitnessErrorToast(submitError.message)
            } else {
                showFitnessErrorToast('Une erreur est survenue. Merci de réessayer.')
            }
        }
    }

    const openEditDialog = (entry: BodyWeightEntry) => {
        setEditingEntry(entry)
        setEditForm(toFormValues(entry))
    }

    const closeEditDialog = () => {
        if (isMutating) {
            return
        }

        setEditingEntry(null)
    }

    const handleEditSubmit = async () => {
        if (!editingEntry) {
            return
        }

        try {
            const input = buildInputFromForm(editForm)
            await editEntry(editingEntry.id, input)
            setEditingEntry(null)
        } catch (submitError) {
            if (submitError instanceof Error && submitError.message) {
                showFitnessErrorToast(submitError.message)
            } else {
                showFitnessErrorToast('Une erreur est survenue. Merci de réessayer.')
            }
        }
    }

    const handleConfirmDelete = async () => {
        if (!entryToDelete) {
            return
        }

        try {
            await removeEntry(entryToDelete.id)
            setEntryToDelete(null)
        } catch {
            // Error already exposed by hook state.
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Corps
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Suivi du poids</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                        Ajoute ton poids en quelques secondes et suis son évolution dans
                        le temps.
                    </p>
                </div>
                <Button
                    size="xs"
                    icon={<HiOutlineChevronDown />}
                    onClick={scrollToHistory}
                >
                    Historique des entrées
                </Button>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="font-semibold">Ajout rapide</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Saisir un poids prend quelques secondes.
                        </p>
                    </div>
                </div>

                <FormContainer className="mt-4" layout="vertical">
                    <div className="grid gap-4 lg:grid-cols-4">
                        <FormItem label="Date de mesure" asterisk>
                            <DatePicker.DateTimepicker
                                value={fromDateTimeStorageValue(quickForm.measuredAt)}
                                inputFormat="DD/MM/YYYY HH:mm"
                                onChange={(value) =>
                                    setQuickField(
                                        'measuredAt',
                                        value ? toDateTimeStorageValue(value) : '',
                                    )
                                }
                            />
                        </FormItem>

                        <FormItem label="Poids" asterisk>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={quickForm.weight}
                                onChange={(event) =>
                                    setQuickField('weight', event.target.value)
                                }
                            />
                        </FormItem>

                        <FormItem label="Unité" asterisk>
                            <Input
                                asElement="select"
                                value={quickForm.unit}
                                onChange={(event) =>
                                    setQuickField('unit', event.target.value)
                                }
                            >
                                {BODY_WEIGHT_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>
                                        {UNIT_LABELS[unit]}
                                    </option>
                                ))}
                            </Input>
                        </FormItem>

                        <FormItem label="Note (optionnel)">
                            <Input
                                value={quickForm.note}
                                placeholder="Ex: pesée au réveil"
                                onChange={(event) =>
                                    setQuickField('note', event.target.value)
                                }
                            />
                        </FormItem>
                    </div>
                </FormContainer>

                <div className="mt-2 flex justify-end">
                    <Button
                        variant="solid"
                        loading={isMutating}
                        onClick={handleQuickSubmit}
                    >
                        Ajouter l’entrée
                    </Button>
                </div>
            </Card>

            {latestEntry && (
                <Card>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Dernière mesure</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {latestEntry.weight} {latestEntry.unit}
                            </p>
                        </div>
                        <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                            {formatEntryDate(latestEntry)}
                        </Tag>
                    </div>
                </Card>
            )}

            <Card id="body-weight-history" header="Historique des entrées">
                {isLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucune entrée enregistrée pour le moment.
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
                                        <p className="text-lg font-semibold">
                                            {entry.weight} {entry.unit}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="inline-flex items-center gap-1">
                                                <HiOutlineCalendar />
                                                Mesuré le {formatEntryDate(entry)}
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
                                        {entry.note && (
                                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                                {entry.note}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
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
                width={640}
                isOpen={Boolean(editingEntry)}
                onClose={closeEditDialog}
                onRequestClose={closeEditDialog}
            >
                <div className="px-6 py-5">
                    <h5>Modifier l’entrée de poids</h5>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Ajuste la mesure enregistrée si nécessaire.
                    </p>

                    <FormContainer className="mt-4" layout="vertical">
                        <FormItem label="Date de mesure" asterisk>
                            <DatePicker.DateTimepicker
                                value={fromDateTimeStorageValue(editForm.measuredAt)}
                                inputFormat="DD/MM/YYYY HH:mm"
                                onChange={(value) =>
                                    setEditField(
                                        'measuredAt',
                                        value ? toDateTimeStorageValue(value) : '',
                                    )
                                }
                            />
                        </FormItem>

                        <FormItem label="Poids" asterisk>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={editForm.weight}
                                onChange={(event) =>
                                    setEditField('weight', event.target.value)
                                }
                            />
                        </FormItem>

                        <FormItem label="Unité" asterisk>
                            <Input
                                asElement="select"
                                value={editForm.unit}
                                onChange={(event) =>
                                    setEditField('unit', event.target.value)
                                }
                            >
                                {BODY_WEIGHT_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>
                                        {UNIT_LABELS[unit]}
                                    </option>
                                ))}
                            </Input>
                        </FormItem>

                        <FormItem label="Note (optionnel)">
                            <Input
                                value={editForm.note}
                                onChange={(event) =>
                                    setEditField('note', event.target.value)
                                }
                            />
                        </FormItem>
                    </FormContainer>
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
                        onClick={handleEditSubmit}
                    >
                        Enregistrer
                    </Button>
                </div>
            </Dialog>

            <ConfirmDialog
                isOpen={Boolean(entryToDelete)}
                type="danger"
                title="Supprimer cette entrée ?"
                confirmText="Supprimer"
                cancelText="Annuler"
                onClose={() => setEntryToDelete(null)}
                onRequestClose={() => setEntryToDelete(null)}
                onCancel={() => setEntryToDelete(null)}
                onConfirm={handleConfirmDelete}
            >
                <p>
                    Cette action est irréversible. L’entrée de poids sera supprimée de
                    l’historique.
                </p>
            </ConfirmDialog>
        </div>
    )
}

export default BodyWeightPage
