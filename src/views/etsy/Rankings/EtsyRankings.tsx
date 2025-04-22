import reducer, { SLICE_NAME } from './store'
import { injectReducer } from '@/store'
import AdaptableCard from '@/components/shared/AdaptableCard'
import EtsyRankingsTable from './components/OrdersTable'
import EtsyRankingsTableTools from './components/EtsyReviewsTableTools'
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from '@/firebase';
import { Button } from '@/components/ui'
injectReducer(SLICE_NAME, reducer)

const EtsyRankings = () => {

    return (
        <AdaptableCard className="h-full" bodyClass="h-full">
            <div className="lg:flex items-center justify-between mb-4">
                <h3 className="mb-4 lg:mb-0">Etsy Rankings</h3>
                <EtsyRankingsTableTools />
            </div>
            <EtsyRankingsTable />

        </AdaptableCard>
    )
}

export default EtsyRankings
