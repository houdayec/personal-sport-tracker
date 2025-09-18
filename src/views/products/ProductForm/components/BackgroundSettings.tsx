import { Field, FieldProps } from 'formik'
import { Card, Button, Upload } from '@/components/ui'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import { GRADIENT_PRESETS, PATTERNS } from '../ThumbnailStudio_Main'

type Props = {
    meta: any
    setFieldValue: (field: string, value: any) => void
    handleCustomPatternUpload: (files: File[], fileList: File[]) => void
}

export default function BackgroundSettings({ meta, setFieldValue, handleCustomPatternUpload }: Props) {
    const {
        main_gradientEnabled,
        main_gradientSync,
        main_gradientType,
        main_gradientColor1,
        main_gradientColor2,
        main_bgColor,
        main_patternType,
        main_patternColor,
        main_patternOpacity,
        main_patternScale,
        main_patternDiagonal,
    } = meta

    return (
        <>
            <Card>
                <h5 className="font-semibold mb-2">Gradient</h5>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <label className="flex items-center space-x-2">
                        <Field name="thumbnailsMetadata.main_gradientEnabled">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="checkbox"
                                    checked={!!field.value}
                                    onChange={e => setFieldValue(field.name, e.target.checked)}
                                />
                            )}
                        </Field>
                        <span className="text-sm font-medium">Active</span>
                    </label>

                    <label className="flex items-center space-x-2">
                        <Field name="thumbnailsMetadata.main_gradientSync">
                            {({ field }: FieldProps) => (
                                <input
                                    {...field}
                                    type="checkbox"
                                    checked={!!field.value}
                                    onChange={e => setFieldValue(field.name, e.target.checked)}
                                />
                            )}
                        </Field>
                        <span className="text-sm font-medium">Sync Colors</span>
                    </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <label className="flex flex-col items-start text-sm">
                        <span>Type</span>
                        <Field as="select" name="thumbnailsMetadata.main_gradientType" className="input text-sm">
                            <option value="center">Center</option>
                            <option value="diagonal">Bottom-Left → Top-Right</option>
                        </Field>
                    </label>

                    <label className="flex flex-col items-center text-sm">
                        <span>Color 1</span>
                        <Field
                            name="thumbnailsMetadata.main_gradientColor1"
                            type="color"
                            component={Input}
                            className="w-10 h-10 p-0"
                        />
                    </label>

                    <label className="flex flex-col items-center text-sm">
                        <span>Color 2</span>
                        <Field
                            name="thumbnailsMetadata.main_gradientColor2"
                            type="color"
                            component={Input}
                            className="w-10 h-10 p-0"
                        />
                    </label>
                </div>

                <h6 className="font-medium mb-2 mt-4">Presets</h6>
                <div className="flex flex-wrap gap-2">
                    {GRADIENT_PRESETS.map(p => (
                        <Button
                            key={p.name}
                            type="button"
                            onClick={() => {
                                if (!main_gradientSync) {
                                    setFieldValue('thumbnailsMetadata.main_gradientEnabled', true)
                                    setFieldValue('thumbnailsMetadata.main_gradientColor1', p.color1)
                                    setFieldValue('thumbnailsMetadata.main_gradientColor2', p.color2)
                                    setFieldValue('thumbnailsMetadata.main_gradientType', p.type)
                                }
                            }}
                            disabled={main_gradientSync}
                            className={`p-1 border rounded ${main_gradientSync ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{
                                background: `linear-gradient(135deg, ${p.color1} 0%, ${p.color2} 100%)`,
                                width: '40px',
                                height: '40px',
                            }}
                        />
                    ))}
                </div>
            </Card>

            <Card>
                <h5 className="font-semibold mb-2">Background</h5>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <FormItem label="Background Color">
                        <Field name="thumbnailsMetadata.main_bgColor" type="color" component={Input} />
                    </FormItem>
                </div>

                <FormItem label="Pattern">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Pattern buttons */}
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {PATTERNS.map(p => (
                                <div key={p.name} className="relative flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setFieldValue('thumbnailsMetadata.main_patternType', p.name)}
                                        className={`p-1 border rounded ${main_patternType === p.name ? 'border-blue-500' : 'border-gray-300'
                                            }`}
                                    >
                                        {p.src ? (
                                            <img src={p.src} alt={p.label} className="w-12 h-12 object-contain" />
                                        ) : (
                                            <div className="w-12 h-12 flex items-center justify-center text-gray-400">
                                                {p.label}
                                            </div>
                                        )}
                                    </button>

                                    {p.name === 'custom' && main_patternType === 'custom' && (
                                        <div className="absolute left-0 top-full mt-2 z-10">
                                            <Upload
                                                accept=".svg"
                                                onChange={handleCustomPatternUpload}
                                                className="text-xs"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pattern controls */}
                        <div className="grid grid-cols-2 gap-4 min-w-[250px] flex-shrink-0">
                            <FormItem label="Pattern Color">
                                <Field name="thumbnailsMetadata.main_patternColor" type="color" component={Input} />
                            </FormItem>
                            <FormItem label="Pattern Opacity">
                                <Field name="thumbnailsMetadata.main_patternOpacity">
                                    {({ field }: FieldProps) => (
                                        <input {...field} type="range" min={0} max={0.1} step={0.01} className="w-full" />
                                    )}
                                </Field>
                            </FormItem>
                            <FormItem label="Density / Scale">
                                <Field name="thumbnailsMetadata.main_patternScale">
                                    {({ field }: FieldProps) => (
                                        <input
                                            {...field}
                                            type="range"
                                            min={0.1}
                                            max={1}
                                            step={0.05}
                                            onChange={e => setFieldValue(field.name, parseFloat(e.target.value))}
                                        />
                                    )}
                                </Field>
                            </FormItem>
                            <label className="flex items-center space-x-2 mt-2">
                                <Field name="thumbnailsMetadata.main_patternDiagonal" type="checkbox">
                                    {({ field }: FieldProps) => (
                                        <input
                                            {...field}
                                            type="checkbox"
                                            checked={!!field.value}
                                            onChange={e => setFieldValue(field.name, e.target.checked)}
                                        />
                                    )}
                                </Field>
                                <span className="text-sm">Diagonal repeat</span>
                            </label>
                        </div>
                    </div>
                </FormItem>
            </Card>
        </>
    )
}
