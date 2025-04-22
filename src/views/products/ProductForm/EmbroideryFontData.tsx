import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps, useFormikContext } from 'formik'
import { Button, Select } from '@/components/ui'
import CreatableSelect from 'react-select/creatable'

type FormFieldsName = {
    sizes: string[]
    characters?: string[]
    specialCharacters?: string[]
}

type EmbroideryDataFieldsProps = {
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
}

const sizeOptions = [
    '0.25"', '0.5"', '0.75"', '1"', '1.5"', '2"', '2.5"', '3"', '4"', '5"',
].flatMap((size) => [
    { label: `${size} (Satin)`, value: `${size} (Satin)` },
    { label: `${size} (Fill)`, value: `${size} (Fill)` },
])

const characterOptions = [
    { label: 'A-Z', value: 'A-Z' },
    { label: 'a-z', value: 'a-z' },
    { label: '0-9', value: '0-9' },
]

const specialCharacterOptions = `&'*@:,-.=$!#()+%?";/`.split('').map((char) => ({
    label: char,
    value: char,
}))

const EmbroideryFontDataFields = ({ touched, errors }: EmbroideryDataFieldsProps) => {
    const { values, setFieldValue } = useFormikContext<any>()

    return (
        <AdaptableCard divider isLastChild className="mb-4">
            <h5>Embroidery Font Data</h5>
            <p className="mb-6">Sizes and character details for embroidery fonts</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <FormItem
                    label={
                        <div className="flex items-center justify-between">
                            <span>Sizes</span>
                            <Button
                                size="xs"
                                variant="twoTone"
                                className='ml-2'
                                onClick={async (e) => {
                                    e.preventDefault()
                                    const text = await navigator.clipboard.readText()
                                    const sizes = text
                                        .split(',')
                                        .map(s => s.trim())
                                        .filter(Boolean)
                                    setFieldValue('embroideryFontData.sizes', sizes)
                                }}
                            >Paste & Fill
                            </Button>
                        </div>
                    }
                    invalid={!!errors.sizes && !!touched.sizes}
                    errorMessage={errors.sizes as string}
                >
                    <Field name="embroideryFontData.sizes">
                        {({ field, form }: FieldProps) => (
                            <Select
                                isMulti
                                componentAs={CreatableSelect}
                                field={field}
                                form={form}
                                options={sizeOptions}
                                value={field.value?.map((s: string) => ({ label: s, value: s }))}
                                onChange={(option) =>
                                    form.setFieldValue(
                                        field.name,
                                        option.map((o: any) => o.value)
                                    )
                                }
                            />
                        )}
                    </Field>
                </FormItem>


                <FormItem
                    label={
                        <div className="flex items-center justify-between">
                            <span>Characters</span>
                            <Button
                                size="xs"
                                variant="twoTone"
                                className='ml-2'
                                onClick={async (e) => {
                                    e.preventDefault()
                                    const text = await navigator.clipboard.readText()
                                    const chars = text.split(',').map(s => s.trim()).filter(Boolean)
                                    setFieldValue('embroideryFontData.characters', chars)
                                }}
                            >
                                Paste & Fill
                            </Button>
                        </div>
                    }
                    invalid={!!errors.characters && !!touched.characters}
                    errorMessage={errors.characters as string}
                >
                    <Field name="embroideryFontData.characters">
                        {({ field, form }: FieldProps) => (
                            <Select
                                isMulti
                                componentAs={CreatableSelect}
                                field={field}
                                form={form}
                                options={characterOptions}
                                value={field.value?.map((s: string) => ({ label: s, value: s }))}
                                onChange={(option) =>
                                    form.setFieldValue(
                                        field.name,
                                        option.map((o: any) => o.value)
                                    )
                                }
                            />
                        )}
                    </Field>
                </FormItem>


                <FormItem
                    label={
                        <div className="flex items-center justify-between">
                            <span>Special Characters</span>
                            <Button
                                size="xs"
                                variant="twoTone"
                                className='ml-2'
                                onClick={async (e) => {
                                    e.preventDefault()
                                    const text = await navigator.clipboard.readText()
                                    const specials = text.split(/[\s]+/).map(s => s.trim()).filter(Boolean)
                                    setFieldValue('embroideryFontData.specialCharacters', specials)
                                }}
                            >
                                Paste & Fill
                            </Button>
                        </div>
                    }
                    invalid={!!errors.specialCharacters && !!touched.specialCharacters}
                    errorMessage={errors.specialCharacters as string}
                >
                    <Field name="embroideryFontData.specialCharacters">
                        {({ field, form }: FieldProps) => (
                            <Select
                                isMulti
                                componentAs={CreatableSelect}
                                field={field}
                                form={form}
                                options={specialCharacterOptions}
                                value={field.value?.map((s: string) => ({ label: s, value: s }))}
                                onChange={(option) =>
                                    form.setFieldValue(
                                        field.name,
                                        option.map((o: any) => o.value)
                                    )
                                }
                            />
                        )}
                    </Field>
                </FormItem>

            </div>
        </AdaptableCard>
    )
}

export default EmbroideryFontDataFields
