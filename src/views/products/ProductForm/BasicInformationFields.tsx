import AdaptableCard from '@/components/shared/AdaptableCard'
import RichTextEditor from '@/components/shared/RichTextEditor'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik'
import { Select } from '@/components/ui'

type FormFieldsName = {
    name: string
    sku: string
    category: string
}

type BasicInformationFields = {
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
}
const categoryOptions = [
    { label: 'Font', value: 'font' },
    { label: 'Football Font', value: 'football_font' },
    { label: 'Font Bundle', value: 'font_bundle' },
    { label: 'Football Font Bundle', value: 'football_font_bundle' },
    { label: 'Image Font', value: 'vector_font' },
]

const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
    { label: 'Undefined', value: 'undefined' },
]

const BasicInformationFields = (props: BasicInformationFields) => {
    const { touched, errors } = props

    return (
        <AdaptableCard divider className="mb-4">
            <h5>Basic Information</h5>
            <p className="mb-6">Section to config basic product information</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem
                    label="SKU"
                    invalid={(errors.sku && touched.sku) as boolean}
                    errorMessage={errors.sku}
                >
                    <Field
                        type="text"
                        autoComplete="off"
                        name="sku"
                        placeholder="SKU"
                        component={Input}
                    />
                </FormItem>
                <FormItem
                    label="Product Name"
                    invalid={(errors.name && touched.name) as boolean}
                    errorMessage={errors.name}
                >
                    <Field
                        type="text"
                        autoComplete="off"
                        name="name"
                        placeholder="Name"
                        component={Input}
                    />
                </FormItem>
                <FormItem
                    label="Category"
                    invalid={(errors.category && touched.category) as boolean}
                    errorMessage={errors.category}
                >
                    <Field name="category">
                        {({ field, form }: FieldProps) => (
                            <Select
                                options={categoryOptions}
                                value={categoryOptions.find(option => option.value === field.value)}
                                onChange={(option) => form.setFieldValue(field.name, option?.value)}
                            />
                        )}
                    </Field>
                </FormItem>
                <FormItem label="Status">
                    <Field name="status">
                        {({ field, form }: FieldProps) => (
                            <Select
                                options={statusOptions}
                                value={statusOptions.find(option => option.value === field.value)}
                                onChange={(option) => form.setFieldValue(field.name, option?.value)}
                            />
                        )}
                    </Field>
                </FormItem>

                <FormItem label="WordPress ID">
                    <Field
                        type="number"
                        name="wordpressId"
                        placeholder="WordPress ID"
                        component={Input}
                    />
                </FormItem>

                <FormItem label="Etsy ID">
                    <Field
                        type="text"
                        name="etsyId"
                        placeholder="Etsy ID"
                        component={Input}
                    />
                </FormItem>

                <FormItem label="Published on Etsy">
                    <Field name="publishedOnEtsy" type="checkbox">
                        {({ field }: FieldProps) => (
                            <input type="checkbox" {...field} checked={field.value} />
                        )}
                    </Field>
                </FormItem>

                <FormItem label="Published on Website">
                    <Field name="publishedOnWebsite" type="checkbox">
                        {({ field }: FieldProps) => (
                            <input type="checkbox" {...field} checked={field.value} />
                        )}
                    </Field>
                </FormItem>

                <FormItem label="WordPress Reviews - Last Update">
                    <Field
                        type="number"
                        name="wordpressReviewUpdatedAt"
                        placeholder="Timestamp"
                        component={Input}
                    />
                </FormItem>
                {/* 
            <FormItem
                label="Description"
                labelClass="!justify-start"
                invalid={(errors.category && touched.category) as boolean}
                errorMessage={errors.category}
            >
                <Field name="description">
                    {({ field, form }: FieldProps) => (
                        <RichTextEditor
                            value={field.value}
                            onChange={(val) =>
                                form.setFieldValue(field.name, val)
                            }
                        />
                    )}
                </Field>
            </FormItem> */}
            </div>
        </AdaptableCard>
    )
}

export default BasicInformationFields
