import { useState, useEffect } from 'react'
import { useFormikContext, Field, FieldProps } from 'formik'
import { Product } from '@/@types/product'
import AdaptableCard from '@/components/shared/AdaptableCard'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import { generateWordPressHtml } from '@/utils/wordpress/generateWordPressHtml'
import Switcher from '@/components/ui/Switcher'

const WordpressForm = () => {
    const { values, setFieldValue } = useFormikContext<Product>()
    const { category = '', mainKeyword = 'FontMaze', secondKeyword = 'The Eras Tour' } = values

    const [showPreviewExcerpt, setShowPreviewExcerpt] = useState(false)
    const [showPreviewContent, setShowPreviewContent] = useState(false)

    useEffect(() => {
        const { excerpt, content, slug, rankMath } = generateWordPressHtml(category, mainKeyword, secondKeyword)

        setFieldValue('wordpress.excerpt', excerpt)
        setFieldValue('wordpress.content', content)
        setFieldValue('wordpress.slug', slug)
        setFieldValue('wordpress.rankMath', rankMath)  // ← this line is likely missing
    }, [category, mainKeyword, secondKeyword, setFieldValue])
    return (
        <AdaptableCard divider className="mb-4">
            <h5 className="mb-2 text-lg font-semibold">📝 WordPress HTML Description</h5>
            <p className="text-sm text-gray-500 mb-6">
                HTML blocks for WordPress product page based on keywords and category.
            </p>

            <div className="flex flex-col gap-8">
                <FormItem label="Short Description (Excerpt)">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Preview Mode</span>
                        <Switcher
                            checked={showPreviewExcerpt}
                            onChange={() => setShowPreviewExcerpt(!showPreviewExcerpt)}
                        />
                    </div>
                    {showPreviewExcerpt ? (
                        <Field name="wordpress.excerpt">
                            {({ field }: FieldProps) => (
                                <div className="border rounded p-4 bg-white" dangerouslySetInnerHTML={{ __html: field.value }} />
                            )}
                        </Field>
                    ) : (
                        <Field name="wordpress.excerpt">
                            {({ field }: FieldProps) => <Input {...field} textArea rows={10} />}
                        </Field>
                    )}
                </FormItem>

                <FormItem label="Full Description (Content)">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Preview Mode</span>
                        <Switcher
                            checked={showPreviewContent}
                            onChange={() => setShowPreviewContent(!showPreviewContent)}
                        />
                    </div>
                    {showPreviewContent ? (
                        <Field name="wordpress.content">
                            {({ field }: FieldProps) => (
                                <div className="border rounded p-4 bg-white" dangerouslySetInnerHTML={{ __html: field.value }} />
                            )}
                        </Field>
                    ) : (
                        <Field name="wordpress.content">
                            {({ field }: FieldProps) => <Input {...field} textArea rows={18} />}
                        </Field>
                    )}
                </FormItem>
            </div>

            <div className="mt-10 space-y-6">
                <h6 className="text-base font-semibold">🔍 Rank Math SEO</h6>

                <FormItem label="SEO Title">
                    <Field name="wordpress.rankMath.title">
                        {({ field }: FieldProps) => {
                            const chars = field.value?.length || 0
                            const px = Math.round(chars * 9.3)
                            return (
                                <>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{chars} / 60</span>
                                        <span>{px}px / 580px</span>
                                    </div>
                                    <Input {...field} />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This is what will appear in the first line when this post shows up in the search results.
                                    </p>
                                </>
                            )
                        }}
                    </Field>
                </FormItem>

                <FormItem label="Permalink">
                    <Field name="wordpress.rankMath.permalink">
                        {({ field }: FieldProps) => {
                            const chars = field.value?.length || 0
                            return (
                                <>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{chars} / 75</span>
                                    </div>
                                    <Input {...field} />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This is the unique URL of this page, displayed below the post title in the search results.
                                    </p>
                                </>
                            )
                        }}
                    </Field>
                </FormItem>

                <FormItem label="Meta Description">
                    <Field name="wordpress.rankMath.description">
                        {({ field }: FieldProps) => {
                            const chars = field.value?.length || 0
                            const px = Math.round(chars * 6.1)
                            return (
                                <>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{chars} / 160</span>
                                        <span>{px}px / 920px</span>
                                    </div>
                                    <Input {...field} textArea rows={5} />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This is what will appear as the description when this post shows up in the search results.
                                    </p>
                                </>
                            )
                        }}
                    </Field>
                </FormItem>
            </div>

        </AdaptableCard>
    )
}

export default WordpressForm
