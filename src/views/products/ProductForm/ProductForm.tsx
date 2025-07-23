import { forwardRef, useEffect, useState } from 'react'
import { FormContainer } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import hooks from '@/components/ui/hooks'
import StickyFooter from '@/components/shared/StickyFooter'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form, Formik, FormikProps } from 'formik'
import ProductInfoFields from './BasicInformationFields'
import PricingFields from './PricingFields'
import OrganizationFields from './OrganizationFields'
import ProductImages from './ProductImages'
import cloneDeep from 'lodash/cloneDeep'
import { HiOutlineTrash } from 'react-icons/hi'
import { AiOutlineSave } from 'react-icons/ai'
import * as Yup from 'yup'
import { Product, REQUIRED_THUMBNAIL_SLUGS } from '@/@types/product'
import AssetsFields from './AssetsFields'
import EmbroideryFontDataFields from './EmbroideryFontData'
import FontDataFields from './FontData'
import { Tabs } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import ThumbnailMetadataForm from './ThumbnailMetadataForm'
import { useFormikContext } from 'formik';
import ThumbnailForm from './ThumbnailForm'
import WordpressForm from './WordpressForm'
import ExportForm from './ExportForm'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type FormikRef = FormikProps<any>

export type SetSubmitting = (isSubmitting: boolean) => void

export type OnDeleteCallback = React.Dispatch<React.SetStateAction<boolean>>

type OnDelete = (callback: OnDeleteCallback) => void

type ProductForm = {
    initialData?: Product
    type: 'edit' | 'new'
    onDiscard?: () => void
    onDelete?: OnDelete
    onFormSubmit: (formData: Product, setSubmitting: SetSubmitting) => void
}

const { useUniqueId } = hooks

const validationSchema = Yup.object().shape({
    name: Yup.string().required('Product Name Required'),
    sku: Yup.string().required('SKU Required'),
    category: Yup.string().required('Category Required'),
    //categoriesIds: Yup.string().required('Wordpress Category Required'),
    mainKeyword: Yup.string().required('Main Keyword Required'),
    secondKeyword: Yup.string().required('Second Keyword Required'),
    fullPrice: Yup.string().required('Full Price Required'),
    salePrice: Yup.string().required('Sale Price Required'),
    fontData: Yup.object({
        generated: Yup.object().shape({
            fontFamily: Yup.string()
                .trim()
                .min(1, 'Font Family is required')
                .when('$activeTab', {
                    is: (val: string) => val === 'assets',
                    then: s => s.required('Font Family is required'),
                    otherwise: s => s.notRequired(),
                }),
            fullName: Yup.string()
                .trim()
                .min(1, 'Full Name is required')
                .when('$activeTab', {
                    is: (val: string) => val === 'assets',
                    then: s => s.required('Full Name is required'),
                    otherwise: s => s.notRequired(),
                }),
            version: Yup.string()
                .trim()
                .min(1, 'Version is required')
                .when('$activeTab', {
                    is: (val: string) => val === 'assets',
                    then: s => s.required('Version is required'),
                    otherwise: s => s.notRequired(),
                }),
        }),
    }),
})

const DeleteProductButton = ({ onDelete }: { onDelete: OnDelete }) => {
    const [dialogOpen, setDialogOpen] = useState(false)

    const onConfirmDialogOpen = () => {
        setDialogOpen(true)
    }

    const onConfirmDialogClose = () => {
        setDialogOpen(false)
    }

    const handleConfirm = () => {
        onDelete?.(setDialogOpen)
    }

    return (
        <>
            <Button
                className="text-red-600"
                variant="plain"
                size="sm"
                icon={<HiOutlineTrash />}
                type="button"
                onClick={onConfirmDialogOpen}
            >
                Delete
            </Button>
            <ConfirmDialog
                isOpen={dialogOpen}
                type="danger"
                title="Delete product"
                confirmButtonColor="red-600"
                onClose={onConfirmDialogClose}
                onRequestClose={onConfirmDialogClose}
                onCancel={onConfirmDialogClose}
                onConfirm={handleConfirm}
            >
                <p>
                    Are you sure you want to delete this product? All record
                    related to this product will be deleted as well. This action
                    cannot be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

const ProductForm = forwardRef<FormikRef, ProductForm>((props, ref) => {

    const tabOrder = ['product', 'assets', 'thumbnails', 'wordpress', 'export']
    const [activeTab, setActiveTab] = useState('product')
    const [allowedTabs, setAllowedTabs] = useState(['product']) // first tab always allowed

    const {
        type,
        initialData,
        onFormSubmit,
        onDiscard,
        onDelete,
    } = props

    const initialProduct = initialData ?? Product.createEmpty()

    console.log("initial product", initialProduct)
    useEffect(() => {
        const validTabs = updateAllowedTabsFromValues(initialProduct)
        setAllowedTabs(validTabs)
        // Optional auto-jump to next allowed tab
        const currentIndex = tabOrder.indexOf(activeTab)
        const nextTab = tabOrder.find((tab, i) => i > currentIndex && validTabs.includes(tab))
        if (nextTab) setActiveTab(nextTab)
        console.log('Allowed tabs updated:', validTabs)
        console.log('Active tab set to:', nextTab || activeTab)
    }, [initialProduct])

    const canSwitchTo = async (nextTab: string, values: Product): Promise<boolean> => {
        console.log('Checking if can switch to tab:', nextTab)
        if (nextTab === 'assets') {
            const { name, sku } = values
            if (!name || !sku) {
                console.log('Blocked: name or sku missing')
                return false
            }
        }

        return true
    }

    const handleTabChange = async (nextTab: string, values: Product) => {
        console.log('Switching to tab:', nextTab)

        const currentIndex = tabOrder.indexOf(activeTab)
        const nextIndex = tabOrder.indexOf(nextTab)

        if (nextIndex <= currentIndex) {
            setActiveTab(nextTab)
            return
        }

        const valid = await canSwitchTo(nextTab, values)
        if (valid) {
            setAllowedTabs(prev => [...new Set([...prev, nextTab])])
            setActiveTab(nextTab)
        } else {
            console.log('Blocked: validation failed.')
        }
    }

    const updateAllowedTabsFromValues = (values: Product): string[] => {
        const newAllowedTabs = ['product']

        if (values.name && values.sku) {
            newAllowedTabs.push('assets')
        }

        const fontGen = values.fontData?.generated
        if (fontGen?.fontFamily && fontGen?.fullName && fontGen?.version) {
            newAllowedTabs.push('thumbnails')
        }

        // Check if all slugs have generated thumbnails
        const allSlugsGenerated = REQUIRED_THUMBNAIL_SLUGS.every(slug => {
            const entry = values.thumbnails?.[slug]
            console.log(`Checking slug "${slug}":`, entry)
            return entry?.generated === true
        })
        console.log('All slugs generated:', allSlugsGenerated)
        if (allSlugsGenerated) {
            newAllowedTabs.push('wordpress')
        }

        if (values.publishedOnWebsite) {
            newAllowedTabs.push('export')
        }

        return newAllowedTabs
    }


    return (
        <>
            <Formik
                innerRef={ref}
                validationSchema={validationSchema}
                initialValues={initialProduct}
                validateOnChange={false}
                validateOnBlur={false}
                validationContext={{ activeTab }}
                onSubmit={(newProductValues: Product, { setSubmitting }) => {
                    const newProduct = cloneDeep(newProductValues)

                    if (type === 'new') {
                        newProduct.sku = newProductValues.sku
                    }

                    onFormSubmit?.(newProduct, setSubmitting)

                    const validTabs = updateAllowedTabsFromValues(newProduct)
                    setAllowedTabs(validTabs)

                    // Optional auto-jump to next allowed tab
                    //const currentIndex = tabOrder.indexOf(activeTab)
                    //const nextTab = tabOrder.find((tab, i) => i > currentIndex && validTabs.includes(tab))
                    //if (nextTab) setActiveTab(nextTab)
                }}>
                {({ values, touched, errors, isSubmitting }) => {

                    return (
                        <Form>
                            <FormContainer>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="lg:col-span-3">
                                        <Tabs
                                            value={activeTab}
                                            onChange={(nextTab) => handleTabChange(nextTab, values)}
                                        >
                                            <TabList>
                                                <TabNav value="product">🗂 Details</TabNav>
                                                <TabNav value="assets" disabled={!allowedTabs.includes('assets')}>📦 Assets</TabNav>
                                                <TabNav value="thumbnails" disabled={!allowedTabs.includes('thumbnails')}>🖼 Thumbnails</TabNav>
                                                <TabNav value="wordpress" disabled={!allowedTabs.includes('wordpress')}>📝 WordPress Post</TabNav>
                                                <TabNav value="export" disabled={!allowedTabs.includes('export')}>📤 Export</TabNav>
                                            </TabList>

                                            <div className="p-4">
                                                <TabContent value="product">
                                                    <ProductInfoFields touched={touched} errors={errors} />

                                                    {values?.category === 'font' && (
                                                        <FontDataFields touched={touched} errors={errors} />
                                                    )}
                                                </TabContent>

                                                <TabContent value="assets">
                                                    <AssetsFields touched={touched} errors={errors} />
                                                </TabContent>

                                                <TabContent value="thumbnails">
                                                    <ThumbnailForm touched={touched} errors={errors} />
                                                </TabContent>

                                                <TabContent value="wordpress">
                                                    <WordpressForm touched={touched} errors={errors} />
                                                </TabContent>

                                                <TabContent value="export">
                                                    <ExportForm touched={touched} errors={errors} />
                                                </TabContent>
                                            </div>
                                        </Tabs>
                                    </div>
                                </div>
                                <StickyFooter
                                    className="-mx-8 px-8 flex items-center justify-between py-4"
                                    stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                >
                                    <div>
                                        {type === 'edit' && (
                                            <DeleteProductButton
                                                onDelete={onDelete as OnDelete}
                                            />
                                        )}
                                    </div>
                                    <div className="md:flex items-center">
                                        <Button
                                            size="sm"
                                            className="ltr:mr-3 rtl:ml-3"
                                            type="button"
                                            onClick={() => onDiscard?.()}
                                        >
                                            Discard
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="solid"
                                            loading={isSubmitting}
                                            icon={<AiOutlineSave />}
                                            type="submit"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </StickyFooter>
                            </FormContainer>
                        </Form>
                    )
                }}


            </Formik>
        </>
    )
})

ProductForm.displayName = 'ProductForm'

export default ProductForm
