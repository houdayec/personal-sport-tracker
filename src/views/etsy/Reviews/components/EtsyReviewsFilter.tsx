// Filter UI for Etsy Reviews

import { useState, useRef, forwardRef } from 'react'
import { HiOutlineFilter } from 'react-icons/hi'
import {
    getEtsyReviews,
    setFilterData,
    initialTableData,
    useAppDispatch,
    useAppSelector,
    EtsyReviewFilterQueries,
} from '../store'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Radio from '@/components/ui/Radio'
import Drawer from '@/components/ui/Drawer'
import { Field, Form, Formik, FormikProps, FieldProps } from 'formik'
import type { MouseEvent } from 'react'

type FilterFormProps = {
    onSubmitComplete?: () => void
}

type DrawerFooterProps = {
    onSaveClick: (event: MouseEvent<HTMLButtonElement>) => void
    onCancel: (event: MouseEvent<HTMLButtonElement>) => void
}

const FilterForm = forwardRef<FormikProps<EtsyReviewFilterQueries>, FilterFormProps>(
    ({ onSubmitComplete }, ref) => {
        const dispatch = useAppDispatch()
        const filterData = useAppSelector(state => state.etsyReviewsSlice.data.filterData)

        const handleSubmit = (values: EtsyReviewFilterQueries) => {
            onSubmitComplete?.()
            dispatch(setFilterData(values))
            dispatch(getEtsyReviews({
                ...initialTableData,
                filterData: values,
            }))
        }

        return (
            <Formik
                enableReinitialize
                innerRef={ref}
                initialValues={filterData}
                onSubmit={handleSubmit}
            >
                {({ values }) => (
                    <Form>
                        <FormContainer>
                            <FormItem label="Star Rating">
                                <Field name="starRating">
                                    {({ field, form }: FieldProps) => {
                                        const isDisabled = values.onlyBadReviews;

                                        // Reset star rating if "Only Bad Reviews" is checked
                                        if (isDisabled && field.value !== undefined) {
                                            form.setFieldValue("starRating", undefined);
                                        }

                                        const renderStars = (count: number) => (
                                            <span className="inline-flex gap-0.5 ml-1 align-middle">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <svg
                                                        key={i}
                                                        className={`w-4 h-4 ${i < count ? 'text-yellow-400' : 'text-gray-300'}`}
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.943a1 1 0 00.95.69h4.146c.969 0 1.371 1.24.588 1.81l-3.357 2.44a1 1 0 00-.364 1.118l1.286 3.943c.3.921-.755 1.688-1.54 1.118l-3.357-2.44a1 1 0 00-1.175 0l-3.357 2.44c-.784.57-1.838-.197-1.54-1.118l1.286-3.943a1 1 0 00-.364-1.118L2.08 9.37c-.783-.57-.38-1.81.588-1.81h4.146a1 1 0 00.95-.69l1.286-3.943z" />
                                                    </svg>
                                                ))}
                                            </span>
                                        );

                                        return (
                                            <Radio.Group
                                                value={field.value}
                                                disabled={isDisabled}
                                                onChange={val => form.setFieldValue(field.name, val)}
                                                vertical
                                            >
                                                <Radio value={undefined}>All Ratings</Radio>
                                                {[1, 2, 3, 4, 5].map(rating => (
                                                    <Radio key={rating} value={rating}>
                                                        <div className="flex items-center">
                                                            {renderStars(rating)}
                                                        </div>
                                                    </Radio>
                                                ))}
                                            </Radio.Group>
                                        );
                                    }}
                                </Field>
                            </FormItem>


                            <FormItem>
                                <Field name="onlyBadReviews">
                                    {({ field, form }: FieldProps) => (
                                        <Checkbox
                                            checked={field.value}
                                            onChange={val => form.setFieldValue(field.name, val)}
                                        >
                                            Only Bad Reviews (1-3 Stars)
                                        </Checkbox>
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="Treated Reviews">
                                <Field name="treated">
                                    {({ field, form }: FieldProps) => (
                                        <Radio.Group
                                            value={field.value}
                                            onChange={val => form.setFieldValue(field.name, val)}
                                        >
                                            <Radio value={undefined}>All</Radio>
                                            <Radio value={true}>Treated</Radio>
                                            <Radio value={false}>Not Treated</Radio>
                                        </Radio.Group>
                                    )}
                                </Field>
                            </FormItem>

                            <FormItem label="Sync with WordPress">
                                <Field name="syncWithWordPress">
                                    {({ field, form }: FieldProps) => (
                                        <Radio.Group
                                            value={field.value}
                                            onChange={val => form.setFieldValue(field.name, val)}
                                        >
                                            <Radio value={undefined}>All</Radio>
                                            <Radio value={true}>Synced</Radio>
                                            <Radio value={false}>Not Synced</Radio>
                                        </Radio.Group>
                                    )}
                                </Field>
                            </FormItem>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        )
    }
)

const DrawerFooter = ({ onSaveClick, onCancel }: DrawerFooterProps) => (
    <div className="text-right w-full">
        <Button size="sm" className="mr-2" onClick={onCancel}>
            Cancel
        </Button>
        <Button size="sm" variant="solid" onClick={onSaveClick}>
            Apply
        </Button>
    </div>
)

const EtsyReviewFilter = () => {
    const formikRef = useRef<FormikProps<EtsyReviewFilterQueries>>(null)
    const [isOpen, setIsOpen] = useState(false)

    const openDrawer = () => setIsOpen(true)
    const onDrawerClose = () => setIsOpen(false)
    const formSubmit = () => formikRef.current?.submitForm()

    return (
        <>
            <Button
                size="sm"
                className="block md:inline-block ltr:md:ml-2 rtl:md:mr-2 md:mb-0 md:mt-0 mb-4 mt-4"
                icon={<HiOutlineFilter />}
                onClick={openDrawer}
            >
                Filter
            </Button>
            <Drawer
                title="Filter Reviews"
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
export default EtsyReviewFilter
