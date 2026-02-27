import { useState, useRef, forwardRef } from 'react'
import { HiOutlineFilter, HiOutlineSearch } from 'react-icons/hi'
import {
    getProducts,
    setFilterData,
    initialTableData,
    useAppDispatch,
    useAppSelector,
    ProductFilterQueries,
} from '../store'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Radio from '@/components/ui/Radio'
import Drawer from '@/components/ui/Drawer'
import { Field, Form, Formik, FormikProps, FieldProps } from 'formik'
import type { MouseEvent } from 'react'
import { PRODUCT_CATEGORIES } from '@/@types/product'

type FilterFormProps = {
    onSubmitComplete?: () => void
}

type DrawerFooterProps = {
    onSaveClick: (event: MouseEvent<HTMLButtonElement>) => void
    onCancel: (event: MouseEvent<HTMLButtonElement>) => void
}

const FilterForm = forwardRef<FormikProps<ProductFilterQueries>, FilterFormProps>(
    ({ onSubmitComplete }, ref) => {
        const dispatch = useAppDispatch()

        const filterData = useAppSelector(
            (state) => state.salesProductList.data.filterData,
        )

        const handleSubmit = (values: ProductFilterQueries) => {
            onSubmitComplete?.()
            dispatch(setFilterData(values))
            dispatch(getProducts({
                ...initialTableData,
                filterData: values,
            }))
        }

        return (
            <Formik
                enableReinitialize
                innerRef={ref}
                initialValues={filterData}
                onSubmit={(values) => {
                    handleSubmit(values)
                }}
            >
                {({ values, touched, errors }) => (
                    <Form>
                        <FormContainer>

                            <FormItem label="Category">
                                <Field name="category">
                                    {({ field, form }: FieldProps) => (
                                        <Checkbox.Group
                                            vertical
                                            value={values.category}
                                            onChange={(options) =>
                                                form.setFieldValue(field.name, options)
                                            }
                                        >
                                            {PRODUCT_CATEGORIES.map((cat) => (
                                                <Checkbox
                                                    key={cat.value}
                                                    name={field.name}
                                                    value={cat.value}
                                                    className="mb-3"
                                                >
                                                    {cat.label}
                                                </Checkbox>
                                            ))}
                                        </Checkbox.Group>
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="Published on Etsy">
                                <Field name="etsyPublished">
                                    {({ field, form }: FieldProps) => (
                                        <Radio.Group
                                            value={field.value}
                                            onChange={(val) => form.setFieldValue(field.name, val)}
                                        >
                                            <Radio value={undefined}>All</Radio>
                                            <Radio value={true}>Published</Radio>
                                            <Radio value={false}>Not Published</Radio>
                                        </Radio.Group>
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="Published on Website">
                                <Field name="websitePublished">
                                    {({ field, form }: FieldProps) => (
                                        <Radio.Group
                                            value={field.value}
                                            onChange={(val) => form.setFieldValue(field.name, val)}
                                        >
                                            <Radio value={undefined}>All</Radio>
                                            <Radio value={true}>Published</Radio>
                                            <Radio value={false}>Not Published</Radio>
                                        </Radio.Group>
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="WordPress ID">
                                <Field name="wordpressLinked">
                                    {({ field, form }: FieldProps) => (
                                        <Radio.Group
                                            value={field.value}
                                            onChange={(val) => form.setFieldValue(field.name, val)}
                                        >
                                            <Radio value={undefined}>All</Radio>
                                            <Radio value={true}>Has WP ID</Radio>
                                            <Radio value={false}>Missing WP ID</Radio>
                                        </Radio.Group>
                                    )}
                                </Field>
                            </FormItem>

                        </FormContainer>
                    </Form>
                )}
            </Formik>
        )
    },
)

const DrawerFooter = ({ onSaveClick, onCancel }: DrawerFooterProps) => {
    return (
        <div className="text-right w-full">
            <Button size="sm" className="mr-2" onClick={onCancel}>
                Cancel
            </Button>
            <Button size="sm" variant="solid" onClick={onSaveClick}>
                Apply
            </Button>
        </div>
    )
}

const ProductFilter = () => {
    const formikRef = useRef<FormikProps<ProductFilterQueries>>(null)

    const [isOpen, setIsOpen] = useState(false)

    const openDrawer = () => {
        setIsOpen(true)
    }

    const onDrawerClose = () => {
        setIsOpen(false)
    }

    const formSubmit = () => {
        formikRef.current?.submitForm()
    }

    return (
        <>
            <Button
                size="sm"
                className="block md:inline-block ltr:md:ml-2 rtl:md:mr-2 md:mb-0 md:mt-0 mb-4 mt-4"
                icon={<HiOutlineFilter />}
                onClick={() => openDrawer()}
            >
                Filter
            </Button>
            <Drawer
                title="Filter"
                isOpen={isOpen}
                footer={
                    <DrawerFooter
                        onCancel={onDrawerClose}
                        onSaveClick={formSubmit}
                    />
                }
                onClose={onDrawerClose}
                onRequestClose={onDrawerClose}
            >
                <FilterForm ref={formikRef} onSubmitComplete={onDrawerClose} />
            </Drawer>
        </>
    )
}

FilterForm.displayName = 'FilterForm'

export default ProductFilter
