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
import { FiCloud, FiDownload, FiEye, FiPackage } from 'react-icons/fi' // Ensure FiEye and FiDownload are imported
import { SiEtsy, SiWordpress } from 'react-icons/si'
import ProductButtons from './components/ProductsButtons'

// Import Firebase storage functions and the storage instance
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '@/firebase' // Assuming your firebase.ts exports 'storage'

const ProductView = () => {
    const dispatch = useAppDispatch()
    const location = useLocation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<Product | null>(null) // Initialize with null for clarity
    // New state variables for WordPress URLs
    const [wordpressViewUrl, setWordPressViewUrl] = useState<string | null>(null);
    const [wordpressEditUrl, setWordPressEditUrl] = useState<string | null>(null);
    const [firebaseZipDownloadUrl, setFirebaseZipDownloadUrl] = useState<string | null>(null);
    const [firebaseConsoleUrl, setFirebaseConsoleUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const id = location.pathname.substring(
                location.pathname.lastIndexOf('/') + 1,
            )
            if (!id) {
                setLoading(false);
                setData(null);
                return;
            }

            setLoading(true);
            try {
                const response = await dispatch(getProduct({ id })).unwrap();
                setData(response);

                // Only attempt to get URLs if product is published and we have a valid SKU
                if (response.publishedOnWebsite && response.sku) {
                    // Set WordPress view and edit URLs
                    setWordPressViewUrl(response?.wordpress!.view_url || null);
                    setWordPressEditUrl(response?.wordpress!.edit_url || null);

                    try {
                        const zipPath = `products/${response.sku}/files/Final Product.zip`;
                        const zipRef = ref(storage, zipPath);
                        const downloadUrl = await getDownloadURL(zipRef);
                        setFirebaseZipDownloadUrl(downloadUrl);

                        // Construct Firebase Storage console URL
                        const projectId = storage?.app?.options?.projectId;
                        if (projectId) {
                            const consoleUrl = `https://console.firebase.google.com/u/0/project/${projectId}/storage/fmz-dashboard.firebasestorage.app/files/~2Fproducts~2F${response.sku}`;
                            setFirebaseConsoleUrl(consoleUrl);
                        } else {
                            console.warn("Firebase Project ID not found for console URL construction.");
                            setFirebaseConsoleUrl(null);
                        }

                    } catch (error) {
                        console.error("Error fetching Firebase ZIP URL or console URL:", error);
                        setFirebaseZipDownloadUrl(null);
                        setFirebaseConsoleUrl(null);
                    }
                } else {
                    // Reset all URLs if product is not published or SKU is missing
                    setWordPressViewUrl(null);
                    setWordPressEditUrl(null);
                    setFirebaseZipDownloadUrl(null);
                    setFirebaseConsoleUrl(null);
                }
            } catch (error) {
                console.error("Failed to fetch product data:", error);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [location.pathname, dispatch]); // Depend on location.pathname to refetch when route changes

    const onGoogleDriveClick = () => {
        // Ensure data exists before trying to access data.sku
        if (data?.sku) {
            const searchUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(data.sku)}`;
            window.open(searchUrl, "_blank");
        } else {
            console.warn("SKU not available for Google Drive search.");
        }
    };

    return (
        <Container className="h-full">
            <Loading loading={loading}>
                {!isEmpty(data) && data !== null ? (
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
                            <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                                {/* Primary Actions */}
                                <Button
                                    size="sm"
                                    icon={<HiOutlinePencilAlt />}
                                    onClick={() => navigate(`/products/${data.sku}/edit`, { state: { from: location } })}
                                >
                                    Edit
                                </Button>

                                {wordpressViewUrl && (
                                    <Button
                                        size="sm"
                                        icon={<FiEye />}
                                        onClick={() => window.open(wordpressViewUrl, '_blank')}
                                    >
                                        View Website
                                    </Button>
                                )}

                                {firebaseZipDownloadUrl && (
                                    <Button
                                        size="sm"
                                        icon={<FiDownload />}
                                        onClick={() => window.open(firebaseZipDownloadUrl, '_blank')}
                                    >
                                        Download ZIP
                                    </Button>
                                )}

                                {/* Secondary Actions - Less-used or technical */}
                                <div className="relative group">
                                    <Button
                                        size="sm"
                                        icon={<HiOutlineTag />}
                                        className="text-gray-700"
                                    >
                                        More
                                    </Button>
                                    <div className="absolute z-10 hidden group-hover:flex flex-col top-full mt-1 right-0 bg-white border rounded shadow-lg p-2 w-48">
                                        {wordpressEditUrl && (
                                            <Button
                                                variant="plain"
                                                className="justify-start w-full text-sm"
                                                icon={<SiWordpress />}
                                                onClick={() => window.open(wordpressEditUrl, '_blank')}
                                            >
                                                Edit WordPress
                                            </Button>
                                        )}
                                        {firebaseConsoleUrl && (
                                            <Button
                                                variant="plain"
                                                className="justify-start w-full text-sm"
                                                icon={<FiCloud />}
                                                onClick={() => window.open(firebaseConsoleUrl, '_blank')}
                                            >
                                                Open Firebase
                                            </Button>
                                        )}
                                        <Button
                                            variant="plain"
                                            className="justify-start w-full text-sm"
                                            icon={<FaGoogleDrive />}
                                            onClick={onGoogleDriveClick}
                                        >
                                            Google Drive
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid xl:grid-cols-3 gap-4">
                            {/* Ensure sku is available before passing */}
                            {/* {data.sku && <ProductButtons sku={data.sku} />} */}
                            <div className="space-y-4 xl:col-span-1">
                                <ProductDetailsCard product={data} />
                                {/* <FontDetailsCard product={data} /> */}
                            </div>
                            <div className="space-y-4 xl:col-span-1">
                                {/* <EtsyInfoCard data={data.etsy} /> */}
                                <WordPressInfoCard data={data.wordpress} />
                            </div>
                            <div className="space-y-2 xl:col-span-1">
                                {/* You can move ProductButtons here in the future */}
                                {/* <ProductButtons sku={data.sku} /> */}
                            </div>
                        </div>
                    </>
                ) : (
                    !loading && (
                        <div className="h-full flex flex-col items-center justify-center">
                            <DoubleSidedImage
                                src="/img/others/img-2.png"
                                darkModeSrc="/img/others/img-2-dark.png"
                                alt="No product found!"
                            />
                            <h3 className="mt-8">No product found!</h3>
                        </div>
                    )
                )}
            </Loading>
        </Container>
    )

}

export default ProductView
