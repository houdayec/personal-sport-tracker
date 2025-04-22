import reducer, { SLICE_NAME } from './store'
import { injectReducer } from '@/store'
import AdaptableCard from '@/components/shared/AdaptableCard'
import FollowupOrdersTable from './components/OrdersTable'

injectReducer(SLICE_NAME, reducer)

const FollowupEtsyOrderList = () => {
    return (
        <AdaptableCard className="h-full" bodyClass="h-full">
            <div className="lg:flex items-center justify-between mb-4">
                <h3 className="mb-4 lg:mb-0">Followup Reminder</h3>
            </div>
            <FollowupOrdersTable />
        </AdaptableCard>
    )
}

export default FollowupEtsyOrderList
