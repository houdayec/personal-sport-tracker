import Button from '@/components/ui/Button'
import { HiDownload, HiOutlineTrash } from 'react-icons/hi'
import EtsyReviewsTableSearch from './OrderTableSearch'
import { setDeleteMode, useAppDispatch, useAppSelector } from '../store'
import { Link } from 'react-router-dom'
import EtsyReviewFilter from './EtsyReviewsFilter'

const EtsyReviewsTableTools = () => {
    const selectedRows = useAppSelector(
        (state) => state.etsyReviewsSlice.data.selectedRows,
    )
    return (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <EtsyReviewFilter />
            <EtsyReviewsTableSearch />

            <Link download to="/data/order-list.csv" target="_blank">
                <Button block size="sm" icon={<HiDownload />}>
                    Export
                </Button>
            </Link>
        </div>
    )
}

export default EtsyReviewsTableTools
