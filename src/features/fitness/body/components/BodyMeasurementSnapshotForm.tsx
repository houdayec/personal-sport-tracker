import { FormContainer, FormItem, Input } from '@/components/ui'
import {
    BODY_MEASUREMENT_FIELDS,
    BODY_MEASUREMENT_UNITS,
    type BodyMeasurementFieldKey,
    type BodyMeasurementUnit,
} from '@/features/fitness/body/types/bodyMeasurement'

export interface BodyMeasurementSnapshotFormValues {
    measuredAt: string
    unit: BodyMeasurementUnit
    note: string
    values: Record<BodyMeasurementFieldKey, string>
}

interface BodyMeasurementSnapshotFormProps {
    values: BodyMeasurementSnapshotFormValues
    disabled?: boolean
    onFieldChange: (
        field: 'measuredAt' | 'unit' | 'note',
        value: string,
    ) => void
    onMeasurementValueChange: (field: BodyMeasurementFieldKey, value: string) => void
}

const BodyMeasurementSnapshotForm = ({
    values,
    disabled,
    onFieldChange,
    onMeasurementValueChange,
}: BodyMeasurementSnapshotFormProps) => {
    return (
        <FormContainer layout="vertical">
            <div className="grid gap-4 lg:grid-cols-3">
                <FormItem label="Date de mesure" asterisk>
                    <Input
                        type="datetime-local"
                        value={values.measuredAt}
                        onChange={(event) => onFieldChange('measuredAt', event.target.value)}
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
                        {BODY_MEASUREMENT_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                                {unit}
                            </option>
                        ))}
                    </Input>
                </FormItem>

                <FormItem label="Note (optionnel)">
                    <Input
                        value={values.note}
                        placeholder="Ex: prise à jeun"
                        onChange={(event) => onFieldChange('note', event.target.value)}
                        disabled={disabled}
                    />
                </FormItem>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {BODY_MEASUREMENT_FIELDS.map((field) => (
                    <FormItem key={field.key} label={field.label}>
                        <Input
                            type="number"
                            step="0.1"
                            min="0"
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
        </FormContainer>
    )
}

export default BodyMeasurementSnapshotForm
