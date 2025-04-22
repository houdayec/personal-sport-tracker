import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik'
import Button from '@/components/ui/Button'
import { HiOutlineClipboardCopy } from 'react-icons/hi'

type FormFieldsName = {
    name: string
    sku: string
    category: string
}

type ThumbnailMetadataFields = {
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
}

const ThumbnailBlockForm = ({
    label,
    prefix,
}: {
    label: string
    prefix: string
}) => {
    const copy = (value: string, label: string) => {
        navigator.clipboard.writeText(value)
    }

    return (
        <div className="mt-6">
            <h6 className="font-semibold mb-2">{label}</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['alt', 'title', 'caption', 'description'].map((fieldKey) => (
                    <FormItem key={fieldKey} label={fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}>
                        <Field name={`thumbnailsMetadata.${prefix}.${fieldKey}`}>
                            {({ field }: FieldProps) => (
                                <div className="flex gap-2">
                                    <Input {...field} />
                                    <Button
                                        size="md"
                                        icon={<HiOutlineClipboardCopy />}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            copy(field.value, `${prefix} ${fieldKey}`)
                                        }} />
                                </div>
                            )}
                        </Field>
                    </FormItem>
                ))}
            </div>
        </div>
    )
}

const ThumbnailMetadataForm = (props: ThumbnailMetadataFields) => {
    const copy = (value: string, label: string) => {
        navigator.clipboard.writeText(value)
    }

    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mt-0">Thumbnail Metadata</h5>
            <p className="mb-6">Complete metadata to optimize your SEO thumbnails</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['mainKeyword', 'secondKeyword', 'permalink', 'comments'].map((fieldKey) => (
                    <FormItem key={fieldKey} label={fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}>
                        <Field name={`thumbnailsMetadata.${fieldKey}`}>
                            {({ field }: FieldProps) => (
                                <div className="flex gap-2">
                                    <Input {...field} />
                                    <Button
                                        size="md"
                                        icon={<HiOutlineClipboardCopy />}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            copy(field.value, fieldKey)
                                        }} />
                                </div>
                            )}
                        </Field>
                    </FormItem>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <ThumbnailBlockForm label="Main Image Metadata" prefix="main" />
                <ThumbnailBlockForm label="Technical Image Metadata" prefix="technical" />
                <ThumbnailBlockForm label="Picture Metadata" prefix="picture" />
            </div>
        </AdaptableCard>
    )
}

export default ThumbnailMetadataForm
