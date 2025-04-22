import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps, useFormikContext } from 'formik'
import { Select } from '@/components/ui'
import CreatableSelect from 'react-select/creatable'

type FormFieldsName = {
    publishedOnTpt?: boolean
}

type EmbroideryDataFieldsProps = {
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
}

const FontDataFields = ({ touched, errors }: EmbroideryDataFieldsProps) => {
    const { values, setFieldValue } = useFormikContext<any>()

    return (
        <AdaptableCard divider isLastChild className="mb-4">
            <h5>Font Data</h5>
            <p className="mb-6">Sizes and character details for embroidery fonts</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <FormItem label="Published on TPT">
                    <Field name="publishedOnTpt" type="checkbox">
                        {({ field }: FieldProps) => (
                            <input type="checkbox" {...field} checked={field.value} />
                        )}
                    </Field>
                </FormItem>

            </div>
        </AdaptableCard>
    )
}

export default FontDataFields
