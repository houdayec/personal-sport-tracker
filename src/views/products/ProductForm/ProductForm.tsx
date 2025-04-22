import { forwardRef, useState } from 'react'
import { FormContainer } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import hooks from '@/components/ui/hooks'
import StickyFooter from '@/components/shared/StickyFooter'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form, Formik, FormikProps } from 'formik'
import BasicInformationFields from './BasicInformationFields'
import PricingFields from './PricingFields'
import OrganizationFields from './OrganizationFields'
import ProductImages from './ProductImages'
import cloneDeep from 'lodash/cloneDeep'
import { HiOutlineTrash } from 'react-icons/hi'
import { AiOutlineSave } from 'react-icons/ai'
import * as Yup from 'yup'
import { Product } from '@/@types/product'
import EtsyFields from './EtsyFields'
import EmbroideryFontDataFields from './EmbroideryFontData'
import FontDataFields from './FontData'
import { Tabs } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import ThumbnailMetadataForm from './ThumbnailMetadataForm'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type FormikRef = FormikProps<any>

type InitialData = {
    id?: string
    name?: string
    productCode?: string
    img?: string
    imgList?: {
        id: string
        name: string
        img: string
    }[]
    category?: string
    price?: number
    stock?: number
    status?: number
    costPerItem?: number
    bulkDiscountPrice?: number
    taxRate?: number
    tags?: string[]
    brand?: string
    vendor?: string
    description?: string
}

export type FormModel = Omit<InitialData, 'tags'> & {
    tags: { label: string; value: string }[] | string[]
}

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
    const {
        type,
        initialData: initialProduct = Product.createEmpty(),
        onFormSubmit,
        onDiscard,
        onDelete,
    } = props
    console.log("initial product", initialProduct)
    const category = initialProduct.category

    return (
        <>
            <Formik
                innerRef={ref}
                initialValues={{
                    ...initialProduct,
                    tags: initialProduct?.etsy.tags
                        ? initialProduct?.etsy.tags.map((value) => ({
                            label: value,
                            value,
                        }))
                        : [],
                }}
                validationSchema={validationSchema}
                onSubmit={(newProductValues: Product, { setSubmitting }) => {
                    const newProduct = cloneDeep(newProductValues)

                    newProduct.etsy.tags = newProduct.etsy.tags.map((tag: any) =>
                        typeof tag === 'string' ? tag : tag.value
                    )

                    if (type === 'new') {
                        newProduct.sku = newProductValues.sku
                    }

                    onFormSubmit?.(newProduct, setSubmitting)
                }}
            >
                {({ values, touched, errors, isSubmitting }) => {
                    const category = values.category

                    return (
                        <Form>
                            <FormContainer>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="lg:col-span-3">
                                        <Tabs defaultValue="product">
                                            <TabList>
                                                <TabNav value="product">Product</TabNav>
                                                <TabNav value="etsy">Etsy</TabNav>
                                                <TabNav value="website" disabled>Website (Coming)</TabNav>
                                                <TabNav value="thumbnails">Thumbnails Metadata</TabNav>
                                            </TabList>

                                            <div className="p-4">
                                                <TabContent value="product">
                                                    <BasicInformationFields touched={touched} errors={errors} />

                                                    {category === 'football_font' && (
                                                        <EmbroideryFontDataFields touched={touched} errors={errors} />
                                                    )}

                                                    {category === 'font' && (
                                                        <FontDataFields touched={touched} errors={errors} />
                                                    )}
                                                </TabContent>

                                                <TabContent value="etsy">
                                                    <EtsyFields touched={touched} errors={errors} values={values} />
                                                </TabContent>

                                                <TabContent value="website">
                                                    <div className="text-muted">Coming soon...</div>
                                                </TabContent>

                                                <TabContent value="thumbnails">
                                                    <ThumbnailMetadataForm touched={touched} errors={errors} />
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
