import reducer from './store'
import { injectReducer } from '@/store'
import EtsySalesDashboardHeader from './components/SalesDashboardHeader'
import EtsySalesDashboardBody from './components/EtsySalesDashboardBody'

injectReducer('etsySalesDashboard', reducer)

const WebsiteSalesDashboard = () => {
    return (
        <div className="flex flex-col gap-4 h-full">
            <EtsySalesDashboardHeader />
            <EtsySalesDashboardBody />
        </div>
    )
}

export default WebsiteSalesDashboard
