import { useState } from "react"
import Tabs from "@/components/ui/Tabs"
import { SiEtsy, SiFirebase, SiStripe, SiWoo, SiWoocommerce, SiWordpress } from "react-icons/si"

import UploadEtsyReviews from "./components/UploadEtsyReviews"
import UploadEtsyOrderItems from "./components/EtsyOrderItemsUploader"
import UploadEtsyOrders from "./components/UploadEtsyOrders"
import EtsyDownloadButton from "./components/EtsyDownloadButton"
import ProxyStatusDialog from "./components/ProxyStatusDialog"
import FetchProductStructureButton from "./components/FetchProductStructureButton"
import UploadEtsyProducts from "./components/UploadEtsyProducts"
import UploadFonts from "./components/UploadFonts"
import UploadEtsyDeposits from "./components/UploadEtsyDeposits"
import UploadEmbroideryFontData from "./components/UpdateEmbroideryFontData"
import UploadFontData from "./components/UpdateFontData"
import UploadStripeDeposits from "./components/UploadStripeDeposits"
import ResetFollowupStatusButton from "./components/EtsyUpdate"
import ImportWoocommerceProducts from "./components/WooImportProducts"
import { Upload } from "@/components/ui"
import UpdateProfileOnce from "./components/UpdateProfilePicture"
import ImportWooOrders from "./components/WooImportOrder"
import UpdateOrdersWithProduct from "./components/UpdateEtsyOrders"
import WooBulkEditTags from "./components/WooBulkEditTags"

const { TabList, TabNav, TabContent } = Tabs

const Uploader = () => {
    const [showProxyPopup, setShowProxyPopup] = useState(false)
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

    const runActionWithProxyCheck = (action: () => void) => {
        setPendingAction(() => action)
        setShowProxyPopup(true)
    }

    const handleProxyConfirm = () => {
        if (pendingAction) {
            pendingAction()
            setPendingAction(null)
        }
        setShowProxyPopup(false)
    }

    return (
        <Tabs defaultValue="etsy">
            <TabList>
                <TabNav value="etsy" icon={<SiEtsy className="text-orange-600" />}>Etsy</TabNav>
                <TabNav value="database" icon={<SiFirebase className="text-orange-500" />}>Database</TabNav>
                <TabNav value="stripe" icon={<SiStripe className="text-purple-600" />}>Stripe</TabNav>
                <TabNav value="woocommerce" icon={<SiWoo className="text-blue-600" />}>WooCommerce</TabNav>
            </TabList>
            <div className="p-4">
                <TabContent value="etsy">
                    <div className="space-y-4">
                        <EtsyDownloadButton
                            beforeDownload={() =>
                                runActionWithProxyCheck(() => {
                                    window.open("https://www.etsy.com/your/shops/me/download", "_blank")
                                })
                            }
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 gap-y-4">
                            <UploadEtsyOrders />
                            <UploadEtsyOrderItems />
                            <UploadEtsyReviews />
                            <UploadEtsyDeposits />
                            <UploadEtsyProducts />
                        </div>
                    </div>
                </TabContent>
                <TabContent value="database">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 gap-y-4">
                            <UploadFonts />
                            <UploadFontData />
                            <UploadEmbroideryFontData />
                            <FetchProductStructureButton />
                            <UpdateProfileOnce />
                            <UpdateOrdersWithProduct />
                        </div>
                        <ResetFollowupStatusButton />
                    </div>
                </TabContent>
                <TabContent value="stripe">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 gap-y-4">
                            <UploadStripeDeposits />
                        </div>
                    </div>
                </TabContent>
                <TabContent value="woocommerce">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 gap-y-4">
                            <ImportWoocommerceProducts />
                            <ImportWooOrders />
                            <WooBulkEditTags />
                        </div>
                    </div>
                </TabContent>
            </div>
            <ProxyStatusDialog
                isOpen={showProxyPopup}
                onClose={() => setShowProxyPopup(false)}
                onConfirm={handleProxyConfirm}
            />
        </Tabs>
    )
}

export default Uploader
