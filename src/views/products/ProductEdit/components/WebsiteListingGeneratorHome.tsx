import { useEffect, useState } from 'react'
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
} from '../store'
import { injectReducer } from '@/store'
import { useLocation, useNavigate } from 'react-router-dom'

injectReducer('salesProductEdit', reducer)

import WebsiteListingGenerator from './WebsiteListingGenerator'
import WebsiteListingMetadata from './ListingThumbnailMetadataView'
import WebsiteListingView from './WebsiteListingView'
import { Tabs } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'

injectReducer('salesProductEdit', reducer)

const WebsiteListingHome = () => {
    const dispatch = useAppDispatch()
    const location = useLocation()

    const [productId, setProductId] = useState('')
    const product = useAppSelector(
        (state) => state.salesProductEdit.data.product,
    )
    const loading = useAppSelector(
        (state) => state.salesProductEdit.data.loading,
    )
    useEffect(() => {
        const segments = location.pathname.split('/')
        const id = segments[segments.length - 2]
        setProductId(id)
        dispatch(getProduct({ id }))
    }, [location.pathname, dispatch])

    return (
        <Loading loading={loading}>
            {product ? (
                <Tabs defaultValue="generation">
                    <TabList>
                        <TabNav value="generation">Generate</TabNav>
                        <TabNav
                            value="listing"
                            disabled={!product?.websiteMetadata}
                            className={!product?.websiteMetadata ? 'opacity-50 cursor-not-allowed' : ''}>
                            Listing
                        </TabNav>
                        <TabNav
                            value="metadata"
                            disabled={!product?.thumbnailsMetadata}
                            className={!product?.thumbnailsMetadata ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            Metadata
                        </TabNav>
                    </TabList>

                    <div className="p-4">
                        <TabContent value="generation">
                            <WebsiteListingGenerator product={product} />
                        </TabContent>
                        <TabContent value="listing">
                            <WebsiteListingView product={product} />
                        </TabContent>
                        <TabContent value="metadata">
                            <WebsiteListingMetadata product={product} />
                        </TabContent>
                    </div>
                </Tabs>
            ) : (
                <div>No product found.</div>
            )}
        </Loading>
    )
}

export default WebsiteListingHome