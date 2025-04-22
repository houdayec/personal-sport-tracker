import Button from '@/components/ui/Button'
import { HiDownload, HiOutlineTrash } from 'react-icons/hi'
import EtsyReviewsTableSearch from './OrderTableSearch'
import { setDeleteMode, useAppDispatch, useAppSelector } from '../store'
import { Link } from 'react-router-dom'
import EtsyRankingFilter from './EtsyRankingsFilter'

const EtsyRankingsTableTools = () => {
    const selectedRows = useAppSelector(
        (state) => state.etsyRankingsSlice.data.selectedRows,
    )
    return (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <EtsyRankingFilter />
            <EtsyReviewsTableSearch />

            <Link download to="/data/order-list.csv" target="_blank">
                <Button block size="sm" icon={<HiDownload />}>
                    Export
                </Button>
            </Link>
        </div>
    )
}

export default EtsyRankingsTableTools
