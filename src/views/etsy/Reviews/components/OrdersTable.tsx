import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import Tooltip from '@/components/ui/Tooltip'
import { HiOutlineAnnotation, HiOutlineChat, HiOutlineCheckCircle, HiOutlineExternalLink, HiOutlineUser, HiOutlineXCircle } from 'react-icons/hi'
import {
    setSelectedRows,
    addRowItem,
    removeRowItem,
    setDeleteMode,
    setSelectedRow,
    setTableData,
    useAppDispatch,
    useAppSelector,
    getEtsyReviews,
    updateReviewTreatedStatus,
    setReviewList,
} from '../store'
import useThemeClass from '@/utils/hooks/useThemeClass'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import dayjs from 'dayjs'
import type {
    DataTableResetHandle,
    OnSortParam,
    ColumnDef,
    Row,
} from '@/components/shared/DataTable'
import { Avatar, Dialog, Select, Spinner, Tag } from '@/components/ui'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import DataTableWithPaginationBottom from '@/components/shared/DataTableWithPaginationBottom'
import { DoubleSidedImage, Loading } from '@/components/shared'
import { Product } from '@/@types/product'
import { EtsyReview } from '@/@types/etsy_review'
import { FiPackage } from 'react-icons/fi'

const RepeatOrderStatus = ({ status }: { status: boolean }) => {
    const label = status ? 'Repeat' : 'New'
    const base = status ? 'amber' : 'emerald'

    return (
        <Tag className={`bg-${base}-100 text-${base}-600 dark:bg-${base}-500/20 dark:text-${base}-100 border-0 rounded text-xs px-1 py-0.6`}>
            {label}
        </Tag>
    )
}

const EtsyReviewsTable = () => {
    const tableRef = useRef<DataTableResetHandle>(null)

    const [selectedMessages, setSelectedMessages] = useState<Record<string, string>>({});

    const [dialogIsOpen, setIsOpen] = useState(false)
    const [historyOrders, setHistoryOrders] = useState<EtsyReview[]>([])
    const [selectedCustomerName, setSelectedCustomerName] = useState('')

    // Message templates with proper type definition
    const messageTemplates: Record<string, string> = {
        default: "🆕 New Customer",
        repeatCustomer: "🔁 Repeat Customer",
        repeatCustomerNoDiscount: "🔁 Repeat Customer - No Discount",
        oneStar: "⭐",
        twoStar: "⭐⭐",
        threeStar: "⭐⭐⭐",
        fourStar: "⭐⭐⭐⭐",
        fiveStar: "⭐⭐⭐⭐⭐",
    };

    const getMessageTemplates = (review: EtsyReview): Record<string, string> => ({
        oneStar:
            `Hi ${review.reviewer},\n\n` +
            `I'm really sorry to hear that your order didn’t meet your expectations. Your experience matters deeply to me, and I’d love the opportunity to understand what went wrong and make it right.\n\n` +
            `Please don’t hesitate to send me a message—we’ll work together until you’re 100% happy with your purchase.\n\n` +
            `Warm regards,\nMelissa`,

        twoStar:
            `Hi ${review.reviewer},\n\n` +
            `Thank you for your feedback. I noticed you left a 2-star review, and I’m truly sorry your experience wasn’t what you hoped for.\n\n` +
            `I’d really appreciate it if you could let me know what went wrong so I can make it right. Your satisfaction means everything, and I’d love the chance to fix the issue.\n\n` +
            `Looking forward to hearing from you.\n\n` +
            `Best,\nMelissa`,

        threeStar:
            `Hi ${review.reviewer},\n\n` +
            `Thanks so much for your review. I saw you left 3 stars, and while I’m glad you gave us a try, I’d love to know what could have made your experience even better.\n\n` +
            `Your feedback helps us grow and improve, and I’m here if there’s anything I can do to help!\n\n` +
            `Warmly,\nMelissa`,

        fourStar:
            `Hi ${review.reviewer},\n\n` +
            `Thank you for your 4-star review – I really appreciate your support! ⭐⭐⭐⭐\n\n` +
            `I noticed we were just shy of a perfect score, and I’d love to know if there’s anything I can do to make your experience truly 5-star.\n\n` +
            `Your feedback means a lot and helps us make FontMaze even better!\n\n` +
            `Best wishes,\nMelissa`,

        fiveStar:
            `Hi ${review.reviewer} 😊\n\n` +
            `Thank you so much for your 5-star review! ⭐⭐⭐⭐⭐\n` +
            `It means the world to me that you're loving your purchase. As a small thank-you, here’s a 60% off coupon for your next order: GRATEFUL60 🎉\n\n` +
            `I’d love to see you back again soon—feel free to reach out anytime if you need help or just want to share what you’ve created!\n\n` +
            `Thanks again for your support!\nWarmly,\nMelissa`,
    });

    const dispatch = useAppDispatch()

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.etsyReviewsSlice.data.tableData,
    )
    const loading = useAppSelector((state) => state.etsyReviewsSlice.data.loading)
    const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({}); // Track follow-up status

    const data = useAppSelector((state) => state.etsyReviewsSlice.data.reviewList)
    const { textTheme } = useThemeClass()

    const fetchData = useCallback(() => {
        console.log('{ pageIndex, pageSize, sort, query }', {
            pageIndex,
            pageSize,
            sort,
            query,
        })
        dispatch(getEtsyReviews({ pageIndex, pageSize, sort, query }))
    }, [dispatch, pageIndex, pageSize, sort, query])

    useEffect(() => {
        dispatch(setSelectedRows([]))
        fetchData()
    }, [dispatch, fetchData, pageIndex, pageSize, sort])

    useEffect(() => {
        const statusMap: Record<string, boolean> = {};
        data.forEach(order => {
            statusMap[order.orderId] = order.treated;
        });
        setOrderStatus(statusMap);
    }, [data]);

    useEffect(() => {
        if (tableRef) {
            tableRef.current?.resetSelected()
        }
    }, [data])

    const tableData = useMemo(
        () => ({ pageIndex, pageSize, sort, query, total }),
        [pageIndex, pageSize, sort, query, total],
    )

    const groupedRows = useMemo(() => {
        const grouped: { [date: string]: EtsyReview[] } = {}

        data.forEach((review) => {
            const date = dayjs(review.dateReviewed).format('DD MMM YYYY')
            if (!grouped[date]) grouped[date] = []
            grouped[date].push(review)
        })

        const rowsWithHeaders = Object.entries(grouped).flatMap(([date, reviews]) => {
            return [
                { type: 'header', date, count: reviews.length },
                ...reviews.map(order => ({ ...order, type: 'order' })),
            ]
        })

        return rowsWithHeaders
    }, [data])

    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleOpenHistoryPopup = async (order: EtsyReview) => {
        const name = order.buyer?.name;
        console.log("🔍 Viewing order history for:", name);
        setSelectedCustomerName(name);
        setIsOpen(true); // 🟢 Open dialog immediately
        setLoadingHistory(true); // 🕓 Start loading

        try {
            const results = await apiGetCustomerRelatedEtsyReviews(order.orderId);
            setHistoryOrders(results);
        } catch (error) {
            console.error("❌ Failed to fetch order history:", error);
        } finally {
            setLoadingHistory(false); // ✅ Stop loading
        }
    };

    const columns: ColumnDef<EtsyReview | { type: 'header'; date: string; count: number }>[] = useMemo(() => [
        {
            header: 'Reviewer',
            accessorKey: 'reviewer',
            cell: ({ row }) => {
                const review = row.original as EtsyReview | { type: 'header'; date: string; count: number };

                if ('type' in review && review.type === 'header') {
                    return (
                        <div className="py-2">
                            <div className="text-md font-semibold text-gray-700 dark:text-gray-100">{review.date}</div>
                            <div className="text-md text-gray-500">{review.count} {review.count === 1 ? 'review' : 'reviews'}</div>
                        </div>
                    );
                } else {
                    const review = row.original as EtsyReview;
                    const items = review.items || [];

                    return (
                        <div className="flex flex-col gap-2">
                            {/* Review Metadata */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400">#{review.orderId}</span>
                                <span className="text-xs text-gray-500">
                                    {dayjs(review.dateReviewed).format('DD MMM YYYY')}
                                </span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    {review.reviewer}
                                </span>
                            </div>
                        </div>
                    );

                }


            },
        },

        {
            header: 'Review',
            accessorKey: 'starRating',
            cell: ({ row }) => {
                const review = row.original as EtsyReview;
                if ((review as any).type === 'header') return null;
                const items = review.items || [];
                const renderStars = (count: number) => (
                    <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={`w-5 h-5 ${i < count ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.943a1 1 0 00.95.69h4.146c.969 0 1.371 1.24.588 1.81l-3.357 2.44a1 1 0 00-.364 1.118l1.286 3.943c.3.921-.755 1.688-1.54 1.118l-3.357-2.44a1 1 0 00-1.175 0l-3.357 2.44c-.784.57-1.838-.197-1.54-1.118l1.286-3.943a1 1 0 00-.364-1.118L2.08 9.37c-.783-.57-.38-1.81.588-1.81h4.146a1 1 0 00.95-.69l1.286-3.943z" />
                            </svg>
                        ))}
                    </div>
                );

                const isBadReview = review.starRating <= 3;

                return (
                    <div
                        className={`flex flex-col gap-2 p-3 rounded ${isBadReview
                            ? 'border border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-800/10'
                            : ''
                            }`}
                    >
                        {/* Product Images + Names Row */}
                        {items.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-1">
                                {items.map((item, i) => {
                                    const product = item.correspondingProduct;
                                    if (!product) return null;

                                    return (
                                        <div
                                            key={i}
                                            className="flex flex-col items-center w-[52px] text-center"
                                        >
                                            <Avatar
                                                src={product.getImageThumbnail()}
                                                icon={<FiPackage />}
                                                size="sm"
                                                className="w-14 h-14 text-lg"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Review Stars + Message */}
                        <div className="mt-1">{renderStars(review.starRating)}</div>
                        <span className="text-sm italic text-gray-700 dark:text-gray-300">
                            {review.message || '(No message)'}
                        </span>
                    </div>
                );

            },
        },
        {
            header: 'Actions',
            id: 'actions',
            cell: ({ row }) => {
                const review = row.original as EtsyReview;
                if ((review as any).type === 'header') return null;

                const messageKey = {
                    1: "oneStar",
                    2: "twoStar",
                    3: "threeStar",
                    4: "fourStar",
                    5: "fiveStar",
                }[review.starRating] || "default";

                const messageToCopy = getMessageTemplates(review)[messageKey];

                const handleSend = async () => {
                    await navigator.clipboard.writeText(messageToCopy);
                    const etsyUrl = `https://www.etsy.com/your/orders/sold/new?search_query=${review.orderId}&order_id=${review.orderId}&message=${encodeURIComponent(messageToCopy.replace(/\n/g, '%0A').replace(/ /g, '%20'))}`;
                    window.open(etsyUrl, "_blank");
                };

                const handleTreated = async () => {
                    const reviewRef = doc(db, "etsy_reviews", review.id);
                    const newTreatedStatus = !review.treated;

                    try {
                        await updateDoc(reviewRef, { treated: newTreatedStatus });

                        const updatedReview = { ...review, treated: newTreatedStatus };
                        const newData = data.map(r => r.id === review.id ? updatedReview : r);

                        dispatch(setReviewList(newData)); // ✅ update Redux state
                        dispatch(updateReviewTreatedStatus({
                            orderId: review.orderId,
                            isTreated: newTreatedStatus
                        }));

                        console.log(`✅ Treated status updated: ${review.orderId} = ${newTreatedStatus}`);
                    } catch (err) {
                        console.error("❌ Error marking as treated:", err);
                    }
                };

                return (
                    <div className="flex gap-2">
                        <Tooltip title="Answer Publicly">
                            <span
                                className="cursor-pointer p-2 rounded-full transition-all duration-200 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 hover:opacity-80"
                                onClick={() => window.open(`https://www.etsy.com/shop/FontMaze/reviews/${review.id}`, '_blank')}
                            >
                                <HiOutlineAnnotation className="text-xl" />
                            </span>
                        </Tooltip>

                        <Tooltip title="Send Follow-Up Message">
                            <span
                                className="cursor-pointer p-2 rounded-full transition-all duration-200 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200 hover:opacity-80"
                                onClick={handleSend}
                            >
                                <HiOutlineUser className="text-blue-500 text-xl" />
                            </span>
                        </Tooltip>
                        <Tooltip title={review.treated ? "Unmark as Treated" : "Mark as Treated"}>
                            <span
                                className={`cursor-pointer p-2 rounded-full transition-all duration-200 ${review.treated
                                    ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
                                    } hover:opacity-80`}
                                onClick={handleTreated}
                            >
                                {review.treated ? (
                                    <HiOutlineXCircle className="text-xl" />
                                ) : (
                                    <HiOutlineCheckCircle className="text-xl" />
                                )}
                            </span>
                        </Tooltip>

                    </div>
                );
            },
        },
    ], []);

    const onPaginationChange = (page: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageIndex = page
        dispatch(setTableData(newTableData))
    }

    const onSelectChange = (value: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageSize = Number(value)
        newTableData.pageIndex = 1
        dispatch(setTableData(newTableData))
    }

    const onSort = (sort: OnSortParam) => {
        const newTableData = cloneDeep(tableData)
        newTableData.sort = sort
        dispatch(setTableData(newTableData))
    }

    const onRowSelect = (checked: boolean, row: EtsyReview) => {
        if (checked) {
            dispatch(addRowItem([row.orderId]))
        } else {
            dispatch(removeRowItem(row.orderId))
        }
    }

    const onAllRowSelect = useCallback(
        (checked: boolean, rows: Row<EtsyReview>[]) => {
            if (checked) {
                const originalRows = rows.map((row) => row.original)
                const selectedIds: string[] = []
                originalRows.forEach((row) => {
                    selectedIds.push(row.orderId)
                })
                dispatch(setSelectedRows(selectedIds))
            } else {
                dispatch(setSelectedRows([]))
            }
        },
        [dispatch],
    )


    return (
        <>
            <Loading loading={loading}>
                {tableData.total !== 0 && (
                    <div>
                        <DataTableWithPaginationBottom
                            ref={tableRef}
                            columns={columns}
                            data={groupedRows as any}
                            loading={loading}
                            pagingData={{
                                total: tableData.total as number,
                                pageIndex: tableData.pageIndex as number,
                                pageSize: tableData.pageSize as number,
                            }}
                            onPaginationChange={onPaginationChange}
                            onSelectChange={onSelectChange}
                            onSort={onSort}
                            onCheckBoxChange={onRowSelect}
                            onIndeterminateCheckBoxChange={onAllRowSelect}
                        />
                    </div>
                )}
            </Loading>

            {!loading && tableData.total === 0 && (
                <div className="h-full flex flex-col items-center justify-center">
                    <DoubleSidedImage
                        src="/img/others/welcome.png"
                        darkModeSrc="/img/others/welcome-dark.png"
                        alt="No product found!"
                    />
                    <h3 className="mt-8">No message to send!</h3>
                </div>
            )}
        </>
    )

}

export default EtsyReviewsTable
