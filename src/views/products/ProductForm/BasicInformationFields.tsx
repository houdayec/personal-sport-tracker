import AdaptableCard from '@/components/shared/AdaptableCard'
import RichTextEditor from '@/components/shared/RichTextEditor'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik'
import { Select } from '@/components/ui'
import { useEffect, useState } from 'react'
import { fetchWordpressProductCategories } from '@/services/WooService'
import { categoryOptions, getPricingByCategory, statusOptions } from '@/@types/product'

type FormFieldsName = {
    name: string
    sku: string
    category: string
    wordpressCategories: number[]
    mainKeyword: string
    secondKeyword: string
    trademarkName: string
    fullPrice: number
    salePrice: number
}

type BasicInformationFields = {
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
}

const ProductInfoFields = (props: BasicInformationFields) => {
    const { touched, errors } = props
    const [wordpressCategoryOptions, setWordpressCategoryOptions] = useState<{ value: number; label: string }[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        fetchWordpressProductCategories()
            .then((cats) => {
                setWordpressCategoryOptions(cats.map((c) => ({ value: c.id, label: c.name })))
            })
            .finally(() => setLoading(false))
    }, [])

    return (
        <AdaptableCard divider className="mb-4">
            <h5>Product Info</h5>
            <p className="mb-6">Product basic information</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem
                    label="SKU"
                    invalid={(errors.sku && touched.sku) as boolean}
                    errorMessage={errors.sku}
                >
                    <Field
                        type="text"
                        autoComplete="off"
                        name="sku"
                        placeholder="FMZXXX"
                        component={Input}
                    />
                </FormItem>
                <FormItem
                    label="Product Name"
                    invalid={(errors.name && touched.name) as boolean}
                    errorMessage={errors.name}
                >
                    <Field
                        type="text"
                        autoComplete="off"
                        name="name"
                        placeholder="Name"
                        component={Input}
                    />
                </FormItem>
                <FormItem
                    label="Category"
                    invalid={(errors.category && touched.category) as boolean}
                    errorMessage={errors.category}
                >
                    <Field name="category">
                        {({ field, form }: FieldProps) => (
                            <Select
                                options={categoryOptions}
                                value={categoryOptions.find(option => option.value === field.value)}
                                onChange={(option) => {
                                    form.setFieldValue(field.name, option?.value)
                                    const prices = getPricingByCategory(option?.value || '')
                                    form.setFieldValue('fullPrice', prices.fullPrice)
                                    form.setFieldValue('salePrice', prices.salePrice)
                                }}
                            />
                        )}
                    </Field>
                </FormItem>
                <FormItem
                    label="WordPress Categories"
                    invalid={(errors.wordpressCategories && touched.wordpressCategories) as boolean}
                >
                    <Field name="wordpress.categoriesIds">
                        {({ field, form }: FieldProps) => (
                            <Select
                                isMulti
                                isLoading={loading}
                                options={wordpressCategoryOptions}
                                value={wordpressCategoryOptions.filter(option => field.value?.includes(option.value))}
                                onChange={(selected) =>
                                    form.setFieldValue(
                                        field.name,
                                        selected ? selected.map((s) => s.value) : []
                                    )
                                }
                            />
                        )}
                    </Field>
                </FormItem>
                <FormItem label="Main Keyword" invalid={(errors.mainKeyword && touched.secondKeyword) as boolean}>
                    <Field type="text" name="mainKeyword" placeholder="Main keyword" component={Input} />
                </FormItem>
                <FormItem label="Second Keyword" invalid={(errors.secondKeyword && touched.secondKeyword) as boolean}>
                    <Field type="text" name="secondKeyword" placeholder="Second keyword" component={Input} />
                </FormItem>
                <FormItem label="Trademark Name" invalid={(errors.secondKeyword && touched.secondKeyword) as boolean}>
                    <Field type="text" name="wordpress.trademarkName" placeholder="Trademark (Lego, Disney...)" component={Input} />
                </FormItem>

                <FormItem label="Full Price (USD)" invalid={(errors.fullPrice && touched.fullPrice) as boolean}>
                    <Field type="number" name="fullPrice" placeholder="4.99" component={Input} />
                </FormItem>

                <FormItem label="Sale Price (USD)" invalid={(errors.salePrice && touched.salePrice) as boolean}>
                    <Field type="number" name="salePrice" placeholder="2.49" component={Input} />
                </FormItem>

                <FormItem label="WordPress ID">
                    <Field
                        type="number"
                        name="wordpress.id"
                        placeholder="WordPress ID"
                        component={Input}
                    />
                </FormItem>

                <FormItem label="Status">
                    <Field name="status">
                        {({ field, form }: FieldProps) => (
                            <Select
                                options={statusOptions}
                                value={statusOptions.find(option => option.value === field.value)}
                                onChange={(option) => form.setFieldValue(field.name, option?.value)}
                            />
                        )}
                    </Field>
                </FormItem>

                <FormItem label="Show on Website?">
                    <Field name="wordpress.isFeatured" type="checkbox">
                        {({ field }: FieldProps) => (
                            <input type="checkbox" {...field} checked={field.value} />
                        )}
                    </Field>
                </FormItem>


                <FormItem label="Published on Website">
                    <Field name="publishedOnWebsite" type="checkbox">
                        {({ field }: FieldProps) => (
                            <input type="checkbox" {...field} checked={field.value} />
                        )}
                    </Field>
                </FormItem>

                {/* 
                <FormItem label="WordPress Reviews - Last Update">
                    <Field
                        type="number"
                        name="wordpressReviewUpdatedAt"
                        placeholder="Timestamp"
                        component={Input}
                    />
                </FormItem>
                */}

                {/* 
            <FormItem
                label="Description"
                labelClass="!justify-start"
                invalid={(errors.category && touched.category) as boolean}
                errorMessage={errors.category}
            >
                <Field name="description">
                    {({ field, form }: FieldProps) => (
                        <RichTextEditor
                            value={field.value}
                            onChange={(val) =>
                                form.setFieldValue(field.name, val)
                            }
                        />
                    )}
                </Field>
            </FormItem> */}
            </div>
        </AdaptableCard>
    )
}

export default ProductInfoFields
