import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps, useFormikContext } from 'formik'
import Button from '@/components/ui/Button'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { useEffect, useState } from 'react'
import ThumbnailPreviewStudio from './ThumbnailStudio_Main'
import ThumbnailStudioSecondSentence from './ThumbnailStudio_Second'
import ThumbnailStudioThirdCharacters from './ThumbnailStudio_Third'
import ThumbnailStudioFifthMockupLaptop from './ThumbnailStudio_Fifth'
import ThumbnailStudioSixthMockupTablet from './ThumbnailStudio_Sixth'

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

    return (
        <AdaptableCard divider className="mb-4">
            <h2 className="mt-0">🖼️ Thumbnail Generation</h2>
            <p className="mb-6">Generate all thumbnails images & metadata</p>

            <ThumbnailPreviewStudio />
            <ThumbnailStudioSecondSentence />
            <ThumbnailStudioThirdCharacters />
            <ThumbnailStudioFifthMockupLaptop />
            <ThumbnailStudioSixthMockupTablet />
        </AdaptableCard>
    )
}

export default ThumbnailForm
