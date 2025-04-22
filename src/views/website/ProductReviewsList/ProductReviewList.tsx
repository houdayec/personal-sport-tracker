import reducer from './store'
import { injectReducer } from '@/store'
import AdaptableCard from '@/components/shared/AdaptableCard'
import ProductTable from './components/ProductTable'
import ProductTableTools from './components/ProductTableTools'

injectReducer('reviewsProductList', reducer)

const ProductReviewList = () => {
    return (
        <AdaptableCard className="h-full" bodyClass="h-full">
            <h2 className="text-2xl font-bold mb-4 mt-4">Need reviews</h2>
            <ProductTable />
        </AdaptableCard>
    )
}

export default ProductReviewList
