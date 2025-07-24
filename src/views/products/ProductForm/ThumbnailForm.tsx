import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps, useFormikContext } from 'formik'
import Button from '@/components/ui/Button'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { useEffect, useState } from 'react'
import ThumbnailPreviewStudio from './ThumbnailStudio_Main'
import ThumbnailStudio_Sentence from './ThumbnailStudio_Second'
import ThumbnailStudioThirdCharacters from './ThumbnailStudio_Third'
import ThumbnailStudioFifthMockupLaptop from './ThumbnailStudio_Fifth'
import ThumbnailStudioSixthMockupTablet from './ThumbnailStudio_Sixth'
import ThumbnailStudio_IncludedFilesAndCompatibility from './ThumbnailStudio_IncludedFiles'
import { Product } from '@/@types/product'

type FormFieldsName = {
    name: string
    sku: string
    category: string
}

type ThumbnailFormFields = {
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
}
const CANVAS_SIZE = 2000

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



const ThumbnailForm = (props: ThumbnailFormFields) => {
    const copy = (value: string, label: string) => {
        navigator.clipboard.writeText(value)
    }
    const { values, setFieldValue } = useFormikContext<Product>()

    return (
        <AdaptableCard divider className="mb-4">
            <h2 className="mt-0">🖼️ Thumbnail Generation</h2>
            <p className="mb-6">Generate all thumbnails images & metadata</p>
            <Button
                type="button"
                variant="twoTone"
                className="text-blue-600"
                onClick={() => {
                    const encodedPath = encodeURIComponent(`products/${values.sku}/files/thumbnails/square`)
                    const url = `https://console.firebase.google.com/u/0/project/fmz-dashboard/storage/fmz-dashboard.firebasestorage.app/files/~2F${encodedPath}`
                    window.open(url, '_blank')
                }}
            >
                🔎 View Thumbnails on Firebase
            </Button>
            <ThumbnailPreviewStudio />
            <ThumbnailStudio_Sentence />
            <ThumbnailStudioThirdCharacters />
            <ThumbnailStudio_IncludedFilesAndCompatibility />
            <ThumbnailStudioFifthMockupLaptop />
            <ThumbnailStudioSixthMockupTablet />
        </AdaptableCard>
    )
}

export default ThumbnailForm
