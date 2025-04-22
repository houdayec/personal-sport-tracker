import reducer from './store'
import { injectReducer } from '@/store'
import RevenueDashboardHeader from './components/RevenueDashboardHeader'
import RevenueDashboardBody from './components/RevenueDashboardBody'

injectReducer('revenueDashboard', reducer)

const RevenueDashboard = () => {
    return (
        <div className="flex flex-col gap-4 h-full">
            <RevenueDashboardHeader />
            <RevenueDashboardBody />
        </div>
    )
}

export default RevenueDashboard
