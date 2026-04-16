import { useEffect, useState } from 'react'
import { Alert, Button, Dialog, FormContainer, FormItem, Input } from '@/components/ui'
import {
    EXERCISE_EQUIPMENT_OPTIONS,
    EXERCISE_MUSCLE_GROUP_OPTIONS,
    type ExerciseInput,
} from '@/features/fitness/training/types/exercise'

type ExerciseFormDialogMode = 'create' | 'edit'

interface ExerciseFormDialogProps {
    isOpen: boolean
    mode: ExerciseFormDialogMode
    isSubmitting: boolean
    initialValues: ExerciseInput
    onClose: () => void
    onSubmit: (values: ExerciseInput) => Promise<void>
}

interface ExerciseFormErrors {
    name?: string
    muscleGroup?: string
    equipment?: string
}

const getDialogTitle = (mode: ExerciseFormDialogMode) => {
    return mode === 'create' ? 'Nouvel exercice' : 'Modifier l’exercice'
}

const validateExerciseForm = (values: ExerciseInput): ExerciseFormErrors => {
    const errors: ExerciseFormErrors = {}

    if (!values.name.trim()) {
        errors.name = 'Le nom est requis.'
    }

    if (!values.muscleGroup.trim()) {
        errors.muscleGroup = 'Le groupe musculaire est requis.'
    }

    if (!values.equipment.trim()) {
        errors.equipment = 'Le matériel est requis.'
    }

    return errors
}

const ExerciseFormDialog = ({
    isOpen,
    mode,
    isSubmitting,
    initialValues,
    onClose,
    onSubmit,
}: ExerciseFormDialogProps) => {
    const [values, setValues] = useState<ExerciseInput>(initialValues)
    const [errors, setErrors] = useState<ExerciseFormErrors>({})
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setValues(initialValues)
            setErrors({})
            setSubmitError(null)
        }
    }, [initialValues, isOpen])

    const setFieldValue = (field: keyof ExerciseInput, value: string) => {
        setValues((prev) => ({
            ...prev,
            [field]: value,
        }))

        setErrors((prev) => ({
            ...prev,
            [field]: undefined,
        }))
    }

    const handleSubmit = async () => {
        const validationErrors = validateExerciseForm(values)
        const hasValidationErrors = Object.values(validationErrors).some(Boolean)

        if (hasValidationErrors) {
            setErrors(validationErrors)
            return
        }

        try {
            setSubmitError(null)
            await onSubmit({
                name: values.name.trim(),
                muscleGroup: values.muscleGroup.trim(),
                equipment: values.equipment.trim(),
            })
        } catch (submitMutationError) {
            if (
                submitMutationError instanceof Error &&
                submitMutationError.message
            ) {
                setSubmitError(submitMutationError.message)
            } else {
                setSubmitError('Une erreur est survenue. Merci de réessayer.')
            }
        }
    }

    const handleClose = () => {
        if (isSubmitting) {
            return
        }

        onClose()
    }

    return (
        <Dialog
            width={640}
            isOpen={isOpen}
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <div className="px-6 py-5">
                <h5>{getDialogTitle(mode)}</h5>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Renseigne les informations minimales pour enregistrer cet exercice
                    dans la bibliothèque.
                </p>

                {submitError && (
                    <Alert type="danger" className="mt-4">
                        {submitError}
                    </Alert>
                )}

                <FormContainer className="mt-4" layout="vertical">
                    <FormItem
                        label="Nom"
                        asterisk
                        invalid={Boolean(errors.name)}
                        errorMessage={errors.name}
                    >
                        <Input
                            value={values.name}
                            placeholder="Ex: Développé couché"
                            onChange={(event) =>
                                setFieldValue('name', event.target.value)
                            }
                        />
                    </FormItem>

                    <FormItem
                        label="Groupe musculaire"
                        asterisk
                        invalid={Boolean(errors.muscleGroup)}
                        errorMessage={errors.muscleGroup}
                    >
                        <Input
                            value={values.muscleGroup}
                            list="exercise-muscle-group-options"
                            placeholder="Ex: Pectoraux"
                            onChange={(event) =>
                                setFieldValue('muscleGroup', event.target.value)
                            }
                        />
                    </FormItem>

                    <FormItem
                        label="Matériel"
                        asterisk
                        invalid={Boolean(errors.equipment)}
                        errorMessage={errors.equipment}
                    >
                        <Input
                            value={values.equipment}
                            list="exercise-equipment-options"
                            placeholder="Ex: Haltères"
                            onChange={(event) =>
                                setFieldValue('equipment', event.target.value)
                            }
                        />
                    </FormItem>
                </FormContainer>

                <datalist id="exercise-muscle-group-options">
                    {EXERCISE_MUSCLE_GROUP_OPTIONS.map((option) => (
                        <option key={option} value={option} />
                    ))}
                </datalist>
                <datalist id="exercise-equipment-options">
                    {EXERCISE_EQUIPMENT_OPTIONS.map((option) => (
                        <option key={option} value={option} />
                    ))}
                </datalist>
            </div>

            <div className="rounded-b-lg bg-gray-100 px-6 py-3 text-right dark:bg-gray-700">
                <Button
                    className="ltr:mr-2 rtl:ml-2"
                    size="sm"
                    onClick={handleClose}
                >
                    Annuler
                </Button>
                <Button
                    size="sm"
                    variant="solid"
                    loading={isSubmitting}
                    onClick={handleSubmit}
                >
                    {mode === 'create' ? 'Créer l’exercice' : 'Enregistrer'}
                </Button>
            </div>
        </Dialog>
    )
}

export default ExerciseFormDialog
