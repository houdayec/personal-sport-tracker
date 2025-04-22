import orderReducers from './store'
import licensesReducers from './store'
import { injectReducer } from '@/store'
import AdaptableCard from '@/components/shared/AdaptableCard'
import OrdersTable from './components/OrdersTable'
import OrdersTableTools from './components/OrdersTableTools'
import OrderDeleteConfirmation from './components/OrderDeleteConfirmation'
import { Tabs } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import LicensesOrdersTable from './components/LicensesOrdersTable'

injectReducer('salesOrderList', orderReducers)
injectReducer('licensesOrderList', licensesReducers)

const OrderList = () => {
    return (
        <AdaptableCard className="h-full" bodyClass="h-full">
            <div className="lg:flex items-center justify-between mb-4">
                <h3 className="mb-4 lg:mb-0">Orders</h3>
            </div>
            <Tabs defaultValue="tab1">
                <TabList>
                    <TabNav value="tab1">Commercial Licenses</TabNav>
                    <TabNav value="tab2">All orders</TabNav>
                </TabList>
                <div className="p-4">
                    <TabContent value="tab1">
                        <LicensesOrdersTable />
                    </TabContent>
                    <TabContent value="tab2">
                        <OrdersTableTools />
                        <OrdersTable />
                    </TabContent>
                </div>
            </Tabs>

            <OrderDeleteConfirmation />
        </AdaptableCard>
    )
}

export default OrderList
