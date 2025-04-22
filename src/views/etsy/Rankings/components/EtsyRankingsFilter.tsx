import { useState, useRef, forwardRef } from 'react'
import { HiOutlineFilter } from 'react-icons/hi'
import { useAppDispatch, useAppSelector } from '../store'
import { getEtsyRankings, setFilterData, SearchQueryFilterQueries } from '../store'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
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

const FilterForm = forwardRef<FormikProps<SearchQueryFilterQueries>, FilterFormProps>(
    ({ onSubmitComplete }, ref) => {
        const dispatch = useAppDispatch()
        const filterData = useAppSelector(state => state.etsyRankingsSlice.data.filterData)

        const handleSubmit = (values: SearchQueryFilterQueries) => {
            onSubmitComplete?.()
            dispatch(setFilterData(values))
            dispatch(getEtsyRankings({
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
                            {/* Rank Filter */}
                            <FormItem label="Current Rank">
                                <Field name="currentRank">
                                    {({ field, form }: FieldProps) => (
                                        <Radio.Group
                                            value={field.value}
                                            onChange={val => form.setFieldValue(field.name, val)}
                                            vertical
                                        >
                                            <Radio value={undefined}>All Ranks</Radio>
                                            <Radio value={1}>Rank 1</Radio>
                                            <Radio value={2}>Rank 2</Radio>
                                            <Radio value={3}>Rank 3</Radio>
                                            <Radio value={4}>Rank 4</Radio>
                                            <Radio value={5}>Not Ranked (&gt; 4)</Radio>
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

const SearchQueryRankingFilter = () => {
    const formikRef = useRef<FormikProps<SearchQueryFilterQueries>>(null)
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
                Filter Rankings
            </Button>
            <Drawer
                title="Filter Rankings"
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
export default SearchQueryRankingFilter
