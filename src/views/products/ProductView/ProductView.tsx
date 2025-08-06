import { useState, useEffect } from 'react'
import classNames from 'classnames'
import Tag from '@/components/ui/Tag'
import Loading from '@/components/shared/Loading'
import Container from '@/components/shared/Container'
import DoubleSidedImage from '@/components/shared/DoubleSidedImage'
import OrderProducts from './components/OrderProducts'
import PaymentSummary from './components/PaymentSummary'
import ShippingInfo from './components/ShippingInfo'
import Activity from './components/Activity'
import CustomerInfo from './components/CustomerInfo'
import { HiOutlineCalendar, HiOutlinePencilAlt, HiOutlineTag, HiRefresh } from 'react-icons/hi'
import { useLocation, useNavigate } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'
import dayjs from 'dayjs'
import { Product } from '@/@types/product'
import { getProduct, useAppDispatch } from '../ProductEdit/store'
import { Avatar, Button, Tooltip } from '@/components/ui'
import GenerateDownloadLinkButton from './components/GenerateDownloadLinkButton'
import ProductDetailsCard from './components/ProductDetailsCard'
import FontDetailsCard from './components/FontDetailsCard'
import EtsyInfoCard from './components/EtsyInfoCard'
import WordPressInfoCard from './components/WordPressInfoCard'
import { FaGoogleDrive } from 'react-icons/fa'
import { FiDownload, FiEye, FiPackage } from 'react-icons/fi'
import { SiEtsy, SiWordpress } from 'react-icons/si'
import ProductButtons from './components/ProductsButtons'

// Import Firebase storage functions
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '@/firebase' // Assuming your firebase.ts exports 'storage'

const ProductView = () => {
    const dispatch = useAppDispatch()
    const location = useLocation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<Product>()
    const [firebaseZipDownloadUrl, setFirebaseZipDownloadUrl] = useState<string | null>(null);
    const [firebaseConsoleUrl, setFirebaseConsoleUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchData = async () => {
        const id = location.pathname.substring(
            location.pathname.lastIndexOf('/') + 1,
        )
        if (id) {
            setLoading(true)
            const response = await dispatch(getProduct({ id })).unwrap()
            setData(response)

            // Only attempt to get Firebase URLs if product is published
            if (response.publishedOnWebsite) {
                try {
                    const zipPath = `products/${response.sku}/files/Final Product.zip`;
                    const zipRef = ref(storage, zipPath);
                    const downloadUrl = await getDownloadURL(zipRef);
                    setFirebaseZipDownloadUrl(downloadUrl);

                    // Construct Firebase Storage console URL
                    const consoleUrl = `https://console.firebase.google.com/u/0/project/${storage.app.options.projectId}/storage/fmz-dashboard.firebasestorage.app/files/~2Fproducts~2F${response.sku}`;
                    setFirebaseConsoleUrl(consoleUrl);

                } catch (error) {
                    console.error("Error fetching Firebase ZIP URL or console URL:", error);
                    setFirebaseZipDownloadUrl(null);
                    setFirebaseConsoleUrl(null);
                }
            } else {
                setFirebaseZipDownloadUrl(null);
                setFirebaseConsoleUrl(null);
            }

            setLoading(false)
        }
    }

    const onGoogleDriveClick = () => {
        const searchUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(data!.sku)}`;

        // Simulate loading effect before opening Google Drive
        setTimeout(() => {
            window.open(searchUrl, "_blank");
        }, 1000);
    };

    return (
        <Container className="h-full">
            <Loading loading={loading}>
                {!isEmpty(data) && (
                    <>
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                            {/* Info Block */}
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded overflow-hidden border">
                                    {data.getImageThumbnail() ? (
                                        <img
                                            src={data.getImageThumbnail()}
                                            alt={data.getNameWithCategory()}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <Avatar
                                            size="lg"
                                            icon={<FiPackage />}
                                            className="w-full h-full text-xl w-20 h-20"
                                        />
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center mb-1">
                                        <h3 className="text-lg font-semibold">{data.getNameWithCategory()}</h3>
                                    </div>
                                    <span className="flex items-center text-sm text-gray-600">
                                        <HiOutlineTag className="text-base" />
                                        <span className="ltr:ml-2 rtl:mr-2">{data.sku}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Buttons Block */}
                            <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap mt-4 sm:mt-0 lg:mt-0">
                                <Tooltip title="Edit Product">
                                    <Button
                                        variant="twoTone"
                                        icon={<HiOutlinePencilAlt />}
                                        onClick={() =>
                                            navigate(`/products/${data.sku}/edit`, {
                                                state: { from: location },
                                            })
                                        }
                                    />
                                </Tooltip>

                                {/* New: Open in Firebase Storage Button */}
                                {data.publishedOnWebsite && firebaseConsoleUrl && (
                                    <Tooltip title="Open in Firebase Storage">
                                        <Button
                                            variant="twoTone"
                                            icon={<FiEye />} // Using FiPackage for Firebase Storage
                                            onClick={() => window.open(firebaseConsoleUrl, '_blank')}
                                        />
                                    </Tooltip>
                                )}

                                {/* New: Download ZIP from Firebase Button */}
                                {data.publishedOnWebsite && firebaseZipDownloadUrl && (
                                    <Tooltip title="Download ZIP from Firebase">
                                        <Button
                                            variant="twoTone"
                                            icon={<FiDownload />} // Using FiPackage for download
                                            onClick={() => window.open(firebaseZipDownloadUrl, '_blank')}
                                        />
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        <div className="grid xl:grid-cols-2 gap-4">
                            <ProductButtons sku={data.sku} />
                            <div className="space-y-4">
                                <ProductDetailsCard product={data} />
                                <FontDetailsCard product={data} />
                            </div>
                            <div className="space-y-4">
                                {/*<EtsyInfoCard data={data.etsy} />*/}
                                <WordPressInfoCard data={data.wordpress} />
                            </div>
                        </div>
                    </>
                )}
            </Loading>

            {!loading && isEmpty(data) && (
                <div className="h-full flex flex-col items-center justify-center">
                    <DoubleSidedImage
                        src="/img/others/img-2.png"
                        darkModeSrc="/img/others/img-2-dark.png"
                        alt="No order found!"
                    />
                    <h3 className="mt-8">No product found!</h3>
                </div>
            )}
        </Container>
    )
}

export default ProductView
