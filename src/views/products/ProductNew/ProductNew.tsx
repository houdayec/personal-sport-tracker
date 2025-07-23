import ProductForm, {
    FormModel,
    SetSubmitting,
} from '../ProductForm/ProductForm'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useNavigate } from 'react-router-dom'
import { apiCreateNewProduct as apiCreateNewProduct } from '@/services/SalesService'
import { Product } from '@/@types/product'

const ProductNew = () => {
    const navigate = useNavigate()

    const addProduct = async (data: Product | Record<string, any>) => {
        const product = data instanceof Product ? data : new Product(data)
        const response = await apiCreateNewProduct<boolean, Product>(product)
        return response
    }

    const handleFormSubmit = async (
        values: Product,
        setSubmitting: SetSubmitting,
    ) => {
        setSubmitting(true)
        const success = await addProduct(values)
        setSubmitting(false)
        if (success) {
            toast.push(
                <Notification
                    title={'Successfuly added'}
                    type="success"
                    duration={2500}
                >
                    Product successfuly added
                </Notification>,
                {
                    placement: 'bottom-start',
                },
            )
            //navigate('/products')
            navigate('/products/' + values.sku + '/edit')
        } else {
            toast.push(
                <Notification
                    title={'Not added'}
                    type="danger"
                    duration={2500}
                >
                    A product with this SKU already exists
                </Notification>,
                {
                    placement: 'bottom-start',
                },
            )
        }
    }

    const handleDiscard = () => {
        navigate('/products')
    }

    return (
        <>
            <ProductForm
                type="new"
                onFormSubmit={handleFormSubmit}
                onDiscard={handleDiscard}
            />
        </>
    )
}

export default ProductNew
