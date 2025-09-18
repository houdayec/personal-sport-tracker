import { Field, FieldProps } from 'formik'
import { Card, Button } from '@/components/ui'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import { Product, ThumbnailsMetadata } from '@/@types/product'

const CANVAS_SIZE = 2000

type Props = {
    meta: ThumbnailsMetadata
    setFieldValue: (field: string, value: any) => void
    lines: string[]
}

export default function CharacterSettings({ meta, setFieldValue, lines }: Props) {
    const {
        main_showUppercase,
        main_showLowercase,
        main_showNumbers,
        main_showSpecials,
        main_titleText,
        main_titleScale,
        main_charScale,
    } = meta

    return (
        <Card>
            <h5 className="font-semibold mb-2">Characters</h5>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <FormItem label="Color">
                    <Field name="thumbnailsMetadata.main_charColor" type="color" component={Input} />
                </FormItem>

                <FormItem label="Alphabet Size">
                    <Field name="thumbnailsMetadata.main_charScale">
                        {({ field }: FieldProps) => (
                            <input {...field} type="range" min={0.05} max={2} step={0.05} className="w-full" />
                        )}
                    </Field>
                </FormItem>

                <FormItem label="Vertical Offset">
                    <Field name="thumbnailsMetadata.main_charVerticalOffset">
                        {({ field }: FieldProps) => (
                            <input {...field} type="range" min={-100} max={100} step={5} className="w-full" />
                        )}
                    </Field>
                </FormItem>
            </div>

            <FormItem label="Character Sets">
                <div className="flex flex-wrap gap-4">
                    {['Uppercase', 'Lowercase', 'Numbers', 'Specials'].map((opt, key) => (
                        <label key={key} className="flex items-center space-x-2">
                            <Field
                                name={`thumbnailsMetadata.main_show${opt}` as keyof Product}
                                type="checkbox"
                                render={({ field }: FieldProps) => (
                                    <input
                                        {...field}
                                        type="checkbox"
                                        checked={!!field.value}
                                        onChange={e => setFieldValue(field.name, e.target.checked)}
                                    />
                                )}
                            />
                            <span>{opt}</span>
                        </label>
                    ))}
                </div>
            </FormItem>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">

                <FormItem label="Lines">
                    <Field as="select" name="thumbnailsMetadata.main_charLines" className="input">
                        <option value={3}>3 lines</option>
                        <option value={4}>4 lines</option>
                    </Field>
                </FormItem>

                <FormItem label="Line Height">
                    <Field name="thumbnailsMetadata.main_charLineHeight">
                        {({ field }: FieldProps) => (
                            <input
                                {...field}
                                type="range"
                                min={40}
                                max={200}
                                step={5}
                                className="w-full"
                            />
                        )}
                    </Field>
                </FormItem>
            </div>

            <FormItem label="Custom Character Set (one per line, used only if none selected above)">
                <Field
                    name="thumbnailsMetadata.main_charset"
                    as="textarea"
                    rows={5}
                    className="input"
                    disabled={
                        main_showUppercase || main_showLowercase || main_showNumbers || main_showSpecials
                    }
                />
            </FormItem>

            <Button
                type="button"
                onClick={() => {
                    const titleLines = (main_titleText || '').split('\n')
                    const titleArea = CANVAS_SIZE * 0.25
                    const titleFont = Math.floor(titleArea * main_titleScale)
                    const titleSpacing = 10
                    const totalTitleHeight = titleLines.length * titleFont + (titleLines.length - 1) * titleSpacing

                    const spacing = 80
                    const count = lines.length
                    const charFont = Math.floor((CANVAS_SIZE * 0.05) * main_charScale)
                    const totalCharHeight = count * charFont + spacing * (count - 1)

                    const totalContentHeight = totalTitleHeight + 60 + totalCharHeight

                    const newTopOffset = Math.max(0, Math.floor((CANVAS_SIZE - totalContentHeight) / 2))

                    setFieldValue('thumbnailsMetadata.main_topOffset', newTopOffset)
                    setFieldValue('thumbnailsMetadata.main_charVerticalOffset', 0)
                }}
                className="text-sm px-4 py-2 rounded"
            >
                Recenter Title & Alphabet
            </Button>
        </Card>
    )
}
