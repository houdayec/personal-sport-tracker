import { Field, FieldProps } from 'formik'
import { Card } from '@/components/ui'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'

type Props = {
    meta: any
    setFieldValue: (field: string, value: any) => void
}

export default function WatermarkSettings({ meta, setFieldValue }: Props) {
    const { main_titleColor } = meta

    return (
        <Card>
            <h5 className="font-semibold mb-2">Watermark</h5>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormItem label="Color">
                    <div className="flex items-center gap-2">
                        <Field name="thumbnailsMetadata.main_watermarkColor" type="color" component={Input} />
                        <div className="flex gap-1">
                            {['#000000', '#ffffff', main_titleColor].map((preset, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="w-6 h-6 rounded border"
                                    style={{ backgroundColor: preset }}
                                    onClick={() => setFieldValue('thumbnailsMetadata.main_watermarkColor', preset)}
                                />
                            ))}
                        </div>
                    </div>
                </FormItem>

                <FormItem label="Opacity">
                    <Field name="thumbnailsMetadata.main_watermarkOpacity">
                        {({ field }: FieldProps) => (
                            <input {...field} type="range" min={0} max={0.1} step={0.005} className="w-full" />
                        )}
                    </Field>
                </FormItem>

                <FormItem label="Version">
                    <Field name="thumbnailsMetadata.main_watermarkVersion" as="select" className="input">
                        <option value="black">Black</option>
                        <option value="white">White</option>
                    </Field>
                </FormItem>
            </div>
        </Card>
    )
}
