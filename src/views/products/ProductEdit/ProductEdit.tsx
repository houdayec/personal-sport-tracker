import { useEffect } from 'react'
import Loading from '@/components/shared/Loading'
import DoubleSidedImage from '@/components/shared/DoubleSidedImage'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import reducer, {
    getProduct,
    updateProduct,
    deleteProduct,
    useAppSelector,
    useAppDispatch,
} from './store'
import { injectReducer } from '@/store'
import { useLocation, useNavigate } from 'react-router-dom'


import isEmpty from 'lodash/isEmpty'
import ProductForm, { FormModel, OnDeleteCallback, SetSubmitting } from '../ProductForm/ProductForm'
import { Product } from '@/@types/product'

injectReducer('salesProductEdit', reducer)

const ProductEdit = () => {
    const dispatch = useAppDispatch()

    const location = useLocation()
    const navigate = useNavigate()

    const productData = useAppSelector(
        (state) => state.salesProductEdit.data.product,
    )
    const loading = useAppSelector(
        (state) => state.salesProductEdit.data.loading,
    )

    const fetchData = (data: { id: string }) => {
        dispatch(getProduct(data))
    }

    const handleFormSubmit = async (
        values: Product,
        setSubmitting: SetSubmitting,
    ) => {
        console.log("ProductEdit: handleFormSubmit", values)
        setSubmitting(true)
        const success = await updateProduct(values)
        setSubmitting(false)
        if (success) {
            popNotification('updated')
            //navigate(-1)
        }
    }

    const handleDiscard = () => {
        if (location.state?.from) {
            navigate(location.state.from)
        }
    }

    const handleDelete = async (setDialogOpen: OnDeleteCallback) => {
        setDialogOpen(false)
        const success = await deleteProduct({ id: productData.sku })
        if (success) {
            popNotification('deleted')
        }
    }

    const popNotification = (keyword: string) => {
        toast.push(
            <Notification
                title={`Successfuly ${keyword}`}
                type="success"
                duration={2000}
            >
                Product successfuly {keyword}
            </Notification>,
            {
                placement: 'top-end',
            },
        )
        //navigate('/app/sales/product-list')
    }

    useEffect(() => {
        const segments = location.pathname.split('/')
        const sku = segments[segments.length - 2] // second-to-last segment
        const requestParam = { id: sku }
        fetchData(requestParam)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname])

    return (
        <>
            <Loading loading={loading}>
                {!isEmpty(productData) && (
                    <>
                        <ProductForm
                            type="edit"
                            initialData={productData}
                            onFormSubmit={handleFormSubmit}
                            onDiscard={handleDiscard}
                            onDelete={handleDelete}
                        />
                    </>
                )}
            </Loading>
            {!loading && productData.sku == "" && (
                <div className="h-full flex flex-col items-center justify-center">
                    <DoubleSidedImage
                        src="/img/others/img-2.png"
                        darkModeSrc="/img/others/img-2-dark.png"
                        alt="No product found!"
                    />
                    <h3 className="mt-8">No product found!</h3>
                </div>
            )}
        </>
    )
}

export default ProductEdit
