import { Field, FieldProps } from 'formik'
import { Card } from '@/components/ui'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import { hexToRgbaString } from '@/utils/thumbnailUtils'

// keep same presets you already had
const SHADOW_PRESETS = [
    { name: 'none', shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0 },
    { name: 'subtle', shadowColor: '#000000', shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 5, shadowOpacity: 0.5 },
    { name: 'soft-glow', shadowColor: '#FFFFFF', shadowBlur: 15, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0.5 },
    { name: 'deep-drop', shadowColor: '#000000', shadowBlur: 10, shadowOffsetX: 8, shadowOffsetY: 8, shadowOpacity: 0.5 },
    { name: 'long-right', shadowColor: '#000000', shadowBlur: 5, shadowOffsetX: 20, shadowOffsetY: 5, shadowOpacity: 0.4 },
    { name: 'long-left', shadowColor: '#000000', shadowBlur: 5, shadowOffsetX: -20, shadowOffsetY: 5, shadowOpacity: 0.4 },
]

export default function TitleSettings() {
    return (
        <Card className="space-y-5">
            {/* Featured */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold">Title (Featured)</h5>
                    <span className="text-xs text-gray-500">Most-used settings</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-3">
                        <FormItem label="Title (multiline)">
                            <Field
                                name="thumbnailsMetadata.main_titleText"
                                as="textarea"
                                rows={2}
                                className="input"
                                placeholder="e.g. Star\nWars"
                            />
                        </FormItem>
                    </div>

                    <FormItem label="Size">
                        <Field name="thumbnailsMetadata.main_titleScale">
                            {({ field }: FieldProps) => (
                                <input {...field} type="range" min={0.1} max={2} step={0.01} className="w-full" />
                            )}
                        </Field>
                    </FormItem>

                    <FormItem label="Top Margin">
                        <Field name="thumbnailsMetadata.main_topOffset">
                            {({ field }: FieldProps) => (
                                <input {...field} type="range" min={0} max={300} step={10} className="w-full" />
                            )}
                        </Field>
                    </FormItem>

                    <FormItem label="Text Color">
                        <Field name="thumbnailsMetadata.main_titleColor" type="color" component={Input} />
                    </FormItem>
                </div>
            </div>

            {/* Stroke */}
            <div>
                <h6 className="font-medium mb-2">Outline / Stroke</h6>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormItem label="Stroke Color">
                        <Field name="thumbnailsMetadata.main_titleStrokeColor" type="color" component={Input} />
                    </FormItem>

                    <FormItem label="Stroke Width">
                        <Field name="thumbnailsMetadata.main_titleStrokeWidth">
                            {({ field }: FieldProps) => (
                                <input {...field} type="range" min={0} max={50} step={1} className="w-full" />
                            )}
                        </Field>
                    </FormItem>

                    <div className="flex flex-col">
                        <span className="text-sm font-medium mb-1">Preview</span>
                        <div className="h-10 rounded border flex items-center justify-center text-xs text-gray-600">
                            Stroke preview is shown on the main canvas
                        </div>
                    </div>
                </div>
            </div>

            {/* Shadow */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h6 className="font-medium">Shadow (Advanced)</h6>
                    <Field name="thumbnailsMetadata.shadowColor">
                        {({ form }) => (
                            <button
                                type="button"
                                className="text-xs text-blue-600 hover:underline"
                                onClick={() => {
                                    form.setFieldValue('thumbnailsMetadata.shadowColor', '#000000')
                                    form.setFieldValue('thumbnailsMetadata.shadowBlur', 0)
                                    form.setFieldValue('thumbnailsMetadata.shadowOffsetX', 0)
                                    form.setFieldValue('thumbnailsMetadata.shadowOffsetY', 0)
                                    form.setFieldValue('thumbnailsMetadata.shadowOpacity', 0.3)
                                }}
                            >
                                Reset to defaults
                            </button>
                        )}
                    </Field>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-4 lg:col-span-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormItem label="Shadow Color">
                                <Field name="thumbnailsMetadata.shadowColor" type="color" component={Input} />
                            </FormItem>

                            <FormItem label="Opacity">
                                <Field name="thumbnailsMetadata.shadowOpacity">
                                    {({ field }: FieldProps) => (
                                        <input {...field} type="range" min={0} max={1} step={0.05} className="w-full" />
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="Blur">
                                <Field name="thumbnailsMetadata.shadowBlur">
                                    {({ field }: FieldProps) => (
                                        <input {...field} type="range" min={0} max={50} step={1} className="w-full" />
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="Offset X">
                                <Field name="thumbnailsMetadata.shadowOffsetX">
                                    {({ field }: FieldProps) => (
                                        <input {...field} type="range" min={-100} max={100} step={1} className="w-full" />
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="Offset Y">
                                <Field name="thumbnailsMetadata.shadowOffsetY">
                                    {({ field }: FieldProps) => (
                                        <input {...field} type="range" min={-100} max={100} step={1} className="w-full" />
                                    )}
                                </Field>
                            </FormItem>
                        </div>
                    </div>

                    {/* Shadow presets */}
                    <div className="lg:col-span-2">
                        <h6 className="font-medium mb-3">Shadow Presets</h6>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {SHADOW_PRESETS.map(p => (
                                <Field key={p.name} name="thumbnailsMetadata.shadowColor">
                                    {({ form }) => (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                form.setFieldValue('thumbnailsMetadata.shadowColor', p.shadowColor)
                                                form.setFieldValue('thumbnailsMetadata.shadowBlur', p.shadowBlur)
                                                form.setFieldValue('thumbnailsMetadata.shadowOffsetX', p.shadowOffsetX)
                                                form.setFieldValue('thumbnailsMetadata.shadowOffsetY', p.shadowOffsetY)
                                                form.setFieldValue('thumbnailsMetadata.shadowOpacity', p.shadowOpacity)
                                            }}
                                            className="p-2 border rounded bg-white flex flex-col items-center justify-center hover:border-blue-400 transition"
                                        >
                                            <div
                                                className="w-10 h-10 rounded bg-white"
                                                style={{
                                                    backgroundColor: '#fff',
                                                    boxShadow: `${p.shadowOffsetX}px ${p.shadowOffsetY}px ${p.shadowBlur}px ${hexToRgbaString(
                                                        p.shadowColor,
                                                        p.shadowOpacity
                                                    )}`,
                                                }}
                                                title={p.name}
                                            />
                                            <span className="mt-1 text-[10px] text-gray-600 truncate w-full text-center">{p.name}</span>
                                        </button>
                                    )}
                                </Field>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}
