import { useEffect, useState } from 'react'
import ProductForm, {
    FormModel,
    SetSubmitting,
} from '../ProductForm/ProductForm'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useNavigate } from 'react-router-dom'
import { apiCreateNewProduct as apiCreateNewProduct, apiGetNextSku } from '@/services/SalesService'
import { Product } from '@/@types/product'
import Spinner from '@/components/ui/Spinner'

const ProductNew = () => {
    const navigate = useNavigate()
    const [initialData, setInitialData] = useState<Product | undefined>(undefined)
    const [loadingSku, setLoadingSku] = useState(true)

    useEffect(() => {
        let active = true
        ;(async () => {
            try {
                const nextSku = await apiGetNextSku('FMZ', 3)
                if (!active) return
                const product = Product.createEmpty()
                product.sku = nextSku
                setInitialData(product)
            } catch (err) {
                console.error('Failed to get next SKU:', err)
                if (active) {
                    setInitialData(Product.createEmpty())
                }
            } finally {
                if (active) {
                    setLoadingSku(false)
                }
            }
        })()
        return () => {
            active = false
        }
    }, [])

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
            {loadingSku ? (
                <div className="flex items-center gap-2 text-gray-600">
                    <Spinner size="sm" />
                    <span className="text-sm">Preparing product…</span>
                </div>
            ) : (
                <ProductForm
                    type="new"
                    initialData={initialData}
                    onFormSubmit={handleFormSubmit}
                    onDiscard={handleDiscard}
                />
            )}
        </>
    )
}

export default ProductNew
