import AdaptableCard from '@/components/shared/AdaptableCard'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import CreatableSelect from 'react-select/creatable'
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik'
import { RichTextEditor } from '@/components/shared'
import { toast } from '@/components/ui'
import Notification from '@/components/ui/Notification'

type EtsyFieldsProps = {
    touched: FormikTouched<any>
    errors: FormikErrors<any>
    values: any
}

const currencyOptions = ['USD', 'EUR', 'GBP'].map((c) => ({ label: c, value: c }))

const EtsyFields = ({ touched, errors, values }: EtsyFieldsProps) => {
    return (
        <AdaptableCard divider className="mb-4">
            <h5>Etsy</h5>
            <p className="mb-6">Fields synced from Etsy</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">
                    <FormItem label="Title">
                        <Field name="etsy.title" as={Input} placeholder="Etsy Title" />
                    </FormItem>
                </div>

                <FormItem label="Link">
                    <Field name="etsy.link" as={Input} placeholder="Etsy Link" />
                </FormItem>

                <FormItem label="Price">
                    <Field name="etsy.price" type="number" as={Input} />
                </FormItem>

                <FormItem label="Currency">
                    <Field name="etsy.currency">
                        {({ field, form }: FieldProps) => (
                            <Select
                                options={currencyOptions}
                                value={currencyOptions.find(opt => opt.value === field.value)}
                                onChange={(option) => form.setFieldValue(field.name, option?.value)}
                            />
                        )}
                    </Field>
                </FormItem>

                <FormItem label="Quantity">
                    <Field name="etsy.quantity" type="number" as={Input} />
                </FormItem>

                <div className="md:col-span-2">
                    <FormItem label="Tags">
                        <Field name="etsy.tags">
                            {({ field, form }: FieldProps) => (
                                <Select
                                    isMulti
                                    componentAs={CreatableSelect}
                                    options={[]}
                                    value={field.value?.map((tag: string) => ({ label: tag, value: tag }))}
                                    onChange={(option) => {
                                        if (option.length > 13) {
                                            toast.push(
                                                <Notification title="Tag Limit Reached" type="danger">
                                                    Only 13 tags allowed.
                                                </Notification>,
                                                { placement: 'bottom-start' }
                                            )
                                            return
                                        }
                                        form.setFieldValue(
                                            field.name,
                                            option.map((o: any) => o.value)
                                        )
                                    }}
                                />
                            )}
                        </Field>
                    </FormItem>
                </div>


                <div className="md:col-span-2">
                    <FormItem
                        label="Description"
                        labelClass="!justify-start"
                    >
                        <Field name="etsy.description">
                            {({ field, form }: FieldProps) => (
                                <RichTextEditor
                                    value={field.value}
                                    onChange={(val) =>
                                        form.setFieldValue(field.name, val)
                                    }
                                />
                            )}
                        </Field>
                    </FormItem>
                </div>

                {values.etsy?.images?.length > 0 && (
                    <div className="md:col-span-2 mt-6">
                        <h6 className="mb-2 font-semibold">Thumbnails Preview</h6>
                        <div className="flex overflow-x-auto space-x-2 mb-4">
                            {values.etsy.images.map((img: string, index: number) => (
                                <img
                                    key={index}
                                    src={img}
                                    alt={`Image ${index + 1}`}
                                    className="w-32 h-32 object-cover rounded border"
                                />
                            ))}
                        </div>
                        <h6 className="mb-2 font-semibold">Thumbnails URLs</h6>
                        <Field name="etsy.images">
                            {({ field, form }: FieldProps) => (
                                <div className="space-y-2">
                                    {field.value.map((img: string, index: number) => (
                                        <Input
                                            key={index}
                                            value={img}
                                            onChange={(e) => {
                                                const updatedImages = [...field.value]
                                                updatedImages[index] = e.target.value
                                                form.setFieldValue(field.name, updatedImages)
                                            }}
                                            placeholder={`Image URL ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </Field>
                    </div>
                )}

            </div>
        </AdaptableCard>
    )
}

export default EtsyFields
