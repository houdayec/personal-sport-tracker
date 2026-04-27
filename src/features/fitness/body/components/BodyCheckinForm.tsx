import { useRef, useState, type ChangeEvent } from 'react'
import dayjs from 'dayjs'
import {
    Button,
    DatePicker,
    FormContainer,
    FormItem,
    Input,
    Select,
    Tag,
} from '@/components/ui'
import {
    BODY_CHECKIN_FIELDS,
    BODY_CHECKIN_PHOTO_TYPES,
    BODY_CHECKIN_UNITS,
    type BodyCheckinFieldKey,
    type BodyCheckinPhoto,
    type BodyCheckinPhotoType,
    type BodyCheckinUnit,
} from '@/features/fitness/body/types/bodyCheckin'
import { HiOutlineTrash, HiOutlineUpload } from 'react-icons/hi'

export interface BodyCheckinFormValues {
    measuredAt: string
    unit: BodyCheckinUnit
    weight: string
    note: string
    values: Record<BodyCheckinFieldKey, string>
}

export interface PendingBodyCheckinPhoto {
    id: string
    type: BodyCheckinPhotoType
    file: File
    previewUrl: string
}

interface BodyCheckinFormProps {
    values: BodyCheckinFormValues
    existingPhotos?: BodyCheckinPhoto[]
    removedPhotoPaths?: string[]
    newPhotos: PendingBodyCheckinPhoto[]
    disabled?: boolean
    onFieldChange: (
        field: 'measuredAt' | 'unit' | 'weight' | 'note',
        value: string,
    ) => void
    onMeasurementValueChange: (field: BodyCheckinFieldKey, value: string) => void
    onAddPhoto: (type: BodyCheckinPhotoType, file: File) => void
    onRemoveNewPhoto: (id: string) => void
    onToggleRemoveExistingPhoto: (photoPath: string) => void
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

const photoTypeLabel: Record<BodyCheckinPhotoType, string> = {
    front: 'Face',
    side: 'Profil',
    back: 'Dos',
    other: 'Autre',
}

interface PhotoTypeOption {
    value: BodyCheckinPhotoType
    label: string
}

const PHOTO_TYPE_OPTIONS: PhotoTypeOption[] = BODY_CHECKIN_PHOTO_TYPES.map((type) => ({
    value: type,
    label: photoTypeLabel[type],
}))

const BodyCheckinForm = ({
    values,
    existingPhotos = [],
    removedPhotoPaths = [],
    newPhotos,
    disabled,
    onFieldChange,
    onMeasurementValueChange,
    onAddPhoto,
    onRemoveNewPhoto,
    onToggleRemoveExistingPhoto,
}: BodyCheckinFormProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [selectedPhotoType, setSelectedPhotoType] = useState<BodyCheckinPhotoType>('front')

    const triggerFilePicker = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        onAddPhoto(selectedPhotoType, file)
        event.target.value = ''
    }

    const selectedPhotoTypeOption =
        PHOTO_TYPE_OPTIONS.find((option) => option.value === selectedPhotoType) ||
        PHOTO_TYPE_OPTIONS[0]

    return (
        <FormContainer layout="vertical">
            <div className="grid gap-4 lg:grid-cols-4">
                <FormItem label="Date du check-in" asterisk>
                    <DatePicker.DateTimepicker
                        value={fromDateTimeStorageValue(values.measuredAt)}
                        inputFormat="DD/MM/YYYY HH:mm"
                        onChange={(value) =>
                            onFieldChange(
                                'measuredAt',
                                value ? toDateTimeStorageValue(value) : '',
                            )
                        }
                        disabled={disabled}
                    />
                </FormItem>

                <FormItem label="Unité" asterisk>
                    <Input
                        asElement="select"
                        value={values.unit}
                        onChange={(event) => onFieldChange('unit', event.target.value)}
                        disabled={disabled}
                    >
                        {BODY_CHECKIN_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                                {unit}
                            </option>
                        ))}
                    </Input>
                </FormItem>

                <FormItem label="Poids (optionnel)">
                    <Input
                        type="text"
                        inputMode="decimal"
                        value={values.weight}
                        onChange={(event) => onFieldChange('weight', event.target.value)}
                        placeholder="Ex: 72.4"
                        disabled={disabled}
                    />
                </FormItem>

                <FormItem label="Note (optionnel)">
                    <Input
                        value={values.note}
                        onChange={(event) => onFieldChange('note', event.target.value)}
                        placeholder="Ressenti du jour, contexte..."
                        disabled={disabled}
                    />
                </FormItem>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {BODY_CHECKIN_FIELDS.map((field) => (
                    <FormItem key={field.key} label={field.label}>
                        <Input
                            type="text"
                            inputMode="decimal"
                            value={values.values[field.key]}
                            onChange={(event) =>
                                onMeasurementValueChange(field.key, event.target.value)
                            }
                            placeholder="—"
                            disabled={disabled}
                        />
                    </FormItem>
                ))}
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="font-semibold">Photos progression (0 à 3)</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Types conseillés: face, profil, dos.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-[170px]">
                            <Select<PhotoTypeOption, false>
                                options={PHOTO_TYPE_OPTIONS}
                                value={selectedPhotoTypeOption}
                                isSearchable={false}
                                isDisabled={disabled}
                                onChange={(option) =>
                                    setSelectedPhotoType(
                                        (option?.value as BodyCheckinPhotoType) || 'front',
                                    )
                                }
                            />
                        </div>
                        <Button
                            size="sm"
                            icon={<HiOutlineUpload />}
                            onClick={triggerFilePicker}
                            disabled={disabled}
                        >
                            Ajouter une photo
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                {(existingPhotos.length > 0 || newPhotos.length > 0) && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {existingPhotos.map((photo) => {
                            const isRemoved =
                                Boolean(photo.path) && removedPhotoPaths.includes(photo.path as string)

                            return (
                                <div
                                    key={photo.path || `${photo.type}-${photo.url}`}
                                    className={`rounded-lg border p-2 ${
                                        isRemoved
                                            ? 'border-red-300 opacity-60 dark:border-red-500/40'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    <img
                                        src={photo.url}
                                        alt={`Photo ${photoTypeLabel[photo.type]}`}
                                        className="h-28 w-full rounded object-cover"
                                    />
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                            {photoTypeLabel[photo.type]}
                                        </Tag>
                                        {photo.path && (
                                            <Button
                                                size="xs"
                                                variant="plain"
                                                icon={<HiOutlineTrash />}
                                                onClick={() =>
                                                    onToggleRemoveExistingPhoto(photo.path as string)
                                                }
                                                disabled={disabled}
                                            >
                                                {isRemoved ? 'Restaurer' : 'Retirer'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {newPhotos.map((photo) => (
                            <div
                                key={photo.id}
                                className="rounded-lg border border-emerald-300 p-2 dark:border-emerald-500/40"
                            >
                                <img
                                    src={photo.previewUrl}
                                    alt={`Nouvelle photo ${photoTypeLabel[photo.type]}`}
                                    className="h-28 w-full rounded object-cover"
                                />
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <Tag className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
                                        {photoTypeLabel[photo.type]} (nouvelle)
                                    </Tag>
                                    <Button
                                        size="xs"
                                        variant="plain"
                                        icon={<HiOutlineTrash />}
                                        onClick={() => onRemoveNewPhoto(photo.id)}
                                        disabled={disabled}
                                    >
                                        Retirer
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </FormContainer>
    )
}

export default BodyCheckinForm
