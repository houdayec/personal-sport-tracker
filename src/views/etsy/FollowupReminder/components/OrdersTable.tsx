import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import { HiClock, HiOutlineChat, HiOutlineCheck, HiOutlineCheckCircle, HiOutlineEye, HiOutlinePaperAirplane, HiOutlineSearch, HiOutlineTrash, HiSearchCircle } from 'react-icons/hi'
import { NumericFormat } from 'react-number-format'
import {
    setSelectedRows,
    addRowItem,
    removeRowItem,
    setDeleteMode,
    setSelectedRow,
    getOrders,
    setTableData,
    useAppDispatch,
    useAppSelector,
    getFollowupOrders,
    updateOrderFollowupStatus,
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
import { EtsyOrder } from '@/@types/etsy_order'
import { Button, Dialog, Select, Spinner, Tag } from '@/components/ui'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import DataTableWithPaginationBottom from '@/components/shared/DataTableWithPaginationBottom'
import { DoubleSidedImage, Loading } from '@/components/shared'
import { apiGetCustomerRelatedEtsyOrders } from '@/services/EtsyOrderService'
import { Product } from '@/@types/product'
import { co } from '@fullcalendar/core/internal-common'

const RepeatOrderStatus = ({ status }: { status: boolean }) => {
    const label = status ? 'Repeat' : 'New'
    const base = status ? 'amber' : 'emerald'

    return (
        <Tag className={`bg-${base}-100 text-${base}-600 dark:bg-${base}-500/20 dark:text-${base}-100 border-0 rounded text-xs px-1 py-0.6`}>
            {label}
        </Tag>
    )
}

const OrderColumn = ({ row }: { row: EtsyOrder }) => {
    const { textTheme } = useThemeClass()
    const navigate = useNavigate()

    const onView = useCallback(() => {
        navigate(`/app/sales/order-details/${row.orderId}`)
    }, [navigate, row])

    return (
        <span
            className={`cursor-pointer select-none font-semibold hover:${textTheme}`}
            onClick={onView}
        >
            #{row.orderId}
        </span>
    )
}


const FollowupOrdersTable = () => {
    const tableRef = useRef<DataTableResetHandle>(null)

    const [showProxyPopup, setShowProxyPopup] = useState<boolean>(false);
    const [ipData, setIpData] = useState<{ country: string; flag: string; ip: string } | null>(null);
    const [loadingIp, setLoadingIp] = useState<boolean>(false);
    const [errorIp, setErrorIp] = useState<boolean>(false);
    const [selectedMessages, setSelectedMessages] = useState<Record<string, string>>({});

    const [dialogIsOpen, setIsOpen] = useState(false)
    const [historyOrders, setHistoryOrders] = useState<EtsyOrder[]>([])
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

    const getMessageTemplates = (order: EtsyOrder): Record<string, string> => ({
        default:
            `Hi ${order.buyer.firstname} 👋\n\n` +
            `I just wanted to check in and make sure your order met your expectations. ` +
            `I truly appreciate you choosing FontMaze on Etsy, and I hope you're ` +
            `100% satisfied with your purchase! Please don’t hesitate to message me ` +
            `here if you need any help.\n\n` +
            `I’d be incredibly grateful if you took a moment to leave us some feedback—it helps us grow! ` +
            `Click on the link below:\n👉 https://www.etsy.com/your/purchases/${order.orderId}\n\n` +
            `Thank you so much in advance for taking the time to share your experience ` +
            `and for being a valued customer.\n\n` +
            `Have a wonderful day!\n` +
            `- Melissa`,

        oneStar:
            `Hi ${order.buyer.firstname},\n\n` +
            `I'm really sorry to hear that your order didn’t meet your expectations. Your experience matters deeply to me, and I’d love the opportunity to understand what went wrong and make it right.\n\n` +
            `Please don’t hesitate to send me a message—we’ll work together until you’re 100% happy with your purchase.\n\n` +
            `Warm regards,\nMelissa`,

        twoStar:
            `Hi ${order.buyer.firstname},\n\n` +
            `Thank you for your feedback. I noticed you left a 2-star review, and I’m truly sorry your experience wasn’t what you hoped for.\n\n` +
            `I’d really appreciate it if you could let me know what went wrong so I can make it right. Your satisfaction means everything, and I’d love the chance to fix the issue.\n\n` +
            `Looking forward to hearing from you.\n\n` +
            `Best,\nMelissa`,

        threeStar:
            `Hi ${order.buyer.firstname},\n\n` +
            `Thanks so much for your review. I saw you left 3 stars, and while I’m glad you gave us a try, I’d love to know what could have made your experience even better.\n\n` +
            `Your feedback helps us grow and improve, and I’m here if there’s anything I can do to help!\n\n` +
            `Warmly,\nMelissa`,

        fourStar:
            `Hi ${order.buyer.firstname},\n\n` +
            `Thank you for your 4-star review – I really appreciate your support! ⭐⭐⭐⭐\n\n` +
            `I noticed we were just shy of a perfect score, and I’d love to know if there’s anything I can do to make your experience truly 5-star.\n\n` +
            `Your feedback means a lot and helps us make FontMaze even better!\n\n` +
            `Best wishes,\nMelissa`,

        fiveStar:
            `Hi ${order.buyer.firstname} 😊\n\n` +
            `Thank you so much for your 5-star review! ⭐⭐⭐⭐⭐\n` +
            `It means the world to me that you're loving your purchase. As a small thank-you, here’s a 60% off coupon for your next order: GRATEFUL60 🎉\n\n` +
            `I’d love to see you back again soon—feel free to reach out anytime if you need help or just want to share what you’ve created!\n\n` +
            `Thanks again for your support!\nWarmly,\nMelissa`,

        repeatCustomer:
            `Hi ${order.buyer.firstname} 😊\n\n` +
            `It’s wonderful to see you back at FontMaze! We truly appreciate your continued support 😊\n\n` +
            `As a thank you, here’s a special 60% off discount for your next order: GRATEFUL60\n\n` +
            `If you have a moment, we’d love to hear your feedback! Click here: \n👉 https://www.etsy.com/your/purchases/${order.orderId}\n\n` +
            `And of course, if you ever need help or have any questions, feel free to reach out—I’m always happy to assist.\n\n` +
            `Looking forward to seeing what you create next!\n\n` +
            `Have a great day!\n- Melissa`,

        repeatCustomerNoDiscount:
            `Hi ${order.buyer.firstname} 😊\n\n` +
            `It’s so nice to see you back at FontMaze—thank you for your continued support!\n\n` +
            `If you ever have any questions or need help with your files, don’t hesitate to reach out. I’m always happy to assist 😊\n\n` +
            `If you’d like to share your thoughts, we’d be so grateful for a quick review:\n👉 https://www.etsy.com/your/purchases/${order.orderId}\n\n` +
            `Thanks again for choosing us—we can’t wait to see what you create next!\n\n` +
            `Warm wishes,\n- Melissa`
    });

    const handleSendMessage = async (
        row: EtsyOrder,
        selectedMessages: Record<string, string>
    ) => {
        const newStatus = !row.isFollowupDone;

        // Determine effective key (same logic as in column)
        let effectiveKey = "default";
        if (row.review) {
            switch (row.review.starRating) {
                case 1:
                    effectiveKey = "oneStar";
                    break;
                case 2:
                    effectiveKey = "twoStar";
                    break;
                case 3:
                    effectiveKey = "threeStar";
                    break;
                case 4:
                    effectiveKey = "fourStar";
                    break;
                case 5:
                    effectiveKey = "fiveStar";
                    break;
            }
        }
        if (row.isRepeatOrder) {
            effectiveKey = "repeatCustomerNoDiscount";
        }

        // Override with selected, if any
        const messageKey = selectedMessages[row.orderId] || effectiveKey;
        const messageToCopy = getMessageTemplates(row)[messageKey];

        console.log("📋 Copying message:", messageToCopy);

        const etsyUrl = `https://www.etsy.com/your/orders/sold/new?search_query=${encodeURIComponent(row.orderId)}&order_id=${encodeURIComponent(row.orderId)}&state=alura-customer-followups&message=${encodeURIComponent(
            messageToCopy.replace(/\n/g, '%0A').replace(/ /g, '%20')
        )}`;

        try {
            await navigator.clipboard.writeText(messageToCopy);
            console.log("✅ Message copied to clipboard!");
            window.open(etsyUrl, "_blank");
        } catch (error) {
            console.error("❌ Error updating follow-up status:", error);
        }
    };

    const ActionColumn = ({ row }: { row: EtsyOrder }) => {
        const dispatch = useAppDispatch();
        const { textTheme } = useThemeClass();
        const navigate = useNavigate();
        const isFollowupDone = row.isFollowupDone;

        const onDelete = () => {
            dispatch(setDeleteMode('single'));
            dispatch(setSelectedRow([row.orderId]));
        };

        const onView = useCallback(() => {
            navigate(`/app/sales/order-details/${row.orderId}`);
        }, [navigate, row]);

        const onUpdateStatus = async () => {
            if (!isFollowupDone) {
                handleSendMessage(row, selectedMessages);
            }
            const newStatus = !isFollowupDone; // ✅ Toggle Follow-up Status

            try {
                // ✅ Update Firestore
                const orderRef = doc(db, "etsy_orders", row.orderId);
                await updateDoc(orderRef, { isFollowupDone: newStatus });
                dispatch(updateOrderFollowupStatus({
                    orderId: row.orderId,
                    isFollowupDone: newStatus
                }));

                console.log(`✅ Follow-up status updated for Order ID: ${row.orderId}: ${newStatus}`);
            } catch (error) {
                console.error("❌ Error updating follow-up status:", error);
            }
        };

        return (
            <div className="flex justify-end text-lg">
                <Tooltip title={isFollowupDone ? "Cancel Follow-Up" : "Send Follow-Up"}>
                    <span
                        className={`cursor-pointer p-2 rounded-full transition-all duration-200 ${isFollowupDone
                            ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-200"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200"
                            } hover:opacity-80`}
                        onClick={onUpdateStatus} // ✅ Call only the update function
                    >
                        {isFollowupDone ? (
                            <HiOutlineCheckCircle className="text-green-500 text-xl" />
                        ) : (
                            <HiOutlineChat className="text-blue-500 text-xl" />
                        )}
                    </span>
                </Tooltip>
            </div>
        );
    };

    const dispatch = useAppDispatch()

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.etsyOrderList.data.tableData,
    )
    const loading = useAppSelector((state) => state.etsyOrderList.data.loading)
    const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({}); // Track follow-up status

    const data = useAppSelector((state) => state.etsyOrderList.data.orderList)
    const { textTheme } = useThemeClass()

    const fetchData = useCallback(() => {
        console.log('{ pageIndex, pageSize, sort, query }', {
            pageIndex,
            pageSize,
            sort,
            query,
        })
        dispatch(getFollowupOrders({ pageIndex, pageSize, sort, query }))
    }, [dispatch, pageIndex, pageSize, sort, query])

    useEffect(() => {
        dispatch(setSelectedRows([]))
        fetchData()
    }, [dispatch, fetchData, pageIndex, pageSize, sort])

    useEffect(() => {
        const statusMap: Record<string, boolean> = {};
        data.forEach(order => {
            statusMap[order.orderId] = order.isFollowupDone;
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
        const grouped: { [date: string]: EtsyOrder[] } = {}

        data.forEach((order) => {
            const date = dayjs(order.orderDetails.saleDate).format('DD/MM/YYYY')
            if (!grouped[date]) grouped[date] = []
            grouped[date].push(order)
        })

        const rowsWithHeaders = Object.entries(grouped).flatMap(([date, orders]) => {
            return [
                { type: 'header', date, count: orders.length },
                ...orders.map(order => ({ ...order, type: 'order' })),
            ]
        })

        return rowsWithHeaders
    }, [data])

    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleOpenHistoryPopup = async (order: EtsyOrder) => {
        const name = order.buyer?.name;
        console.log("🔍 Viewing order history for:", name);
        setSelectedCustomerName(name);
        setIsOpen(true); // 🟢 Open dialog immediately
        setLoadingHistory(true); // 🕓 Start loading

        try {
            const results = await apiGetCustomerRelatedEtsyOrders(order.orderId);
            setHistoryOrders(results);
        } catch (error) {
            console.error("❌ Failed to fetch order history:", error);
        } finally {
            setLoadingHistory(false); // ✅ Stop loading
        }
    };

    const columns: ColumnDef<EtsyOrder>[] = useMemo(
        () => [
            {
                header: 'Customer',
                accessorKey: 'buyer.name',
                cell: (props) => {
                    const row = props.row.original
                    if (!row.orderId) return null

                    const date = dayjs(row.orderDetails.saleDate).format('DD MMM YYYY')
                    const isRepeat = row.isRepeatOrder
                    const name = row.buyer?.name
                    return (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                                <div className="text-xs text-gray-500">{date}</div>
                                <div
                                    className="text-md font-semibold mb-1 mt-1 text-gray-600 hover:underline cursor-pointer flex items-center gap-1"
                                    onClick={() => handleOpenHistoryPopup(row)}
                                >
                                    {name}
                                </div>
                                <RepeatOrderStatus status={isRepeat} />
                            </div>
                        </div>
                    );

                }
            },
            {
                header: 'Review',
                accessorKey: 'review',
                cell: (props) => {
                    const row = props.row.original
                    if (!row.orderId) return null
                    if (row.review) {
                        return (
                            <div className="flex flex-col">
                                {renderStars(row.review.starRating)}
                                <span className="text-sm italic">"{row.review.message}"</span>
                                <span className="text-xs text-gray-500">
                                    {dayjs(row.review.dateReviewed).format('DD/MM/YYYY')}
                                </span>
                            </div>
                        )
                    }
                    return <span className="text-gray-400 text-xs">No Review</span>
                },
            },
            {
                header: 'Message',
                accessorKey: 'message',
                cell: (props) => {

                    const row = props.row.original;
                    if (!row.orderId) return null

                    // Determine default message based on review rating
                    let defaultMessageKey = "default";
                    if (row.review) {
                        switch (row.review.starRating) {
                            case 1:
                                defaultMessageKey = "oneStar";
                                break;
                            case 2:
                                defaultMessageKey = "twoStar";
                                break;
                            case 3:
                                defaultMessageKey = "threeStar";
                                break;
                            case 4:
                                defaultMessageKey = "fourStar";
                                break;
                            case 5:
                                defaultMessageKey = "fiveStar";
                                break;
                            default:
                                defaultMessageKey = "default";
                        }
                    }

                    if (row.isRepeatOrder) {
                        defaultMessageKey = "repeatCustomerNoDiscount";
                    }

                    return (
                        <Select
                            size="sm"
                            placeholder="Select Message"
                            options={Object.keys(messageTemplates).map((key) => ({
                                value: key,
                                label: messageTemplates[key],
                            }))}
                            value={{
                                value: selectedMessages[row.orderId] || defaultMessageKey, // Set default based on review
                                label: messageTemplates[selectedMessages[row.orderId] || defaultMessageKey],
                            }}
                            onChange={async (selectedOption) => {
                                if (selectedOption) {
                                    const messageKey = selectedOption.value;
                                    const messageToCopy = getMessageTemplates(row)[messageKey];

                                    try {
                                        await navigator.clipboard.writeText(messageToCopy);
                                        console.log("✅ Message copied to clipboard (on select change)");
                                    } catch (err) {
                                        console.error("❌ Failed to copy message on select:", err);
                                    }

                                    setSelectedMessages((prev) => ({
                                        ...prev,
                                        [row.orderId]: messageKey,
                                    }));
                                }
                            }}
                        />
                    );
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => {
                    const row = props.row.original
                    if (!row.orderId) return null
                    return (<ActionColumn row={props.row.original} />);
                },
            },
        ],
        [selectedMessages] // ✅ Add selectedMessages as a dependency to trigger re-render
    );

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

    const onRowSelect = (checked: boolean, row: EtsyOrder) => {
        if (checked) {
            dispatch(addRowItem([row.orderId]))
        } else {
            dispatch(removeRowItem(row.orderId))
        }
    }

    const onAllRowSelect = useCallback(
        (checked: boolean, rows: Row<EtsyOrder>[]) => {
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

    const renderStars = (count: number) => {
        return (
            <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i < count ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.943a1 1 0 00.95.69h4.146c.969 0 1.371 1.24.588 1.81l-3.357 2.44a1 1 0 00-.364 1.118l1.286 3.943c.3.921-.755 1.688-1.54 1.118l-3.357-2.44a1 1 0 00-1.175 0l-3.357 2.44c-.784.57-1.838-.197-1.54-1.118l1.286-3.943a1 1 0 00-.364-1.118L2.08 9.37c-.783-.57-.38-1.81.588-1.81h4.146a1 1 0 00.95-.69l1.286-3.943z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <>

            <Dialog
                isOpen={dialogIsOpen}
                onClose={() => setIsOpen(false)}
                onRequestClose={() => setIsOpen(false)}
            >
                <h5 className="mb-4 font-semibold text-lg">{selectedCustomerName}'s Orders</h5>

                {loadingHistory ? (
                    <div className="flex justify-center items-center py-10">
                        <Spinner size={24} />
                    </div>
                ) : (
                    <>                <p className="mb-4 text-md text-gray-600">
                        {historyOrders.length} {historyOrders.length === 1 ? 'order' : 'orders'} found
                    </p>

                        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                            {historyOrders.map(order => (
                                <div key={order.orderId} className="border p-4 rounded bg-gray-50 dark:bg-gray-800 shadow-sm">
                                    <div className="flex justify-between mb-2">
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            {dayjs(order.orderDetails.saleDate).format('DD MMM YYYY')}
                                        </div>
                                        <a
                                            href={`https://www.etsy.com/your/orders/sold/completed?ref=seller-platform-mcnav&order_id=${order.orderId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            View Order #{order.orderId}
                                        </a>
                                    </div>

                                    <div className="mb-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            Total: <strong>${order.orderDetails.orderTotal.toFixed(2)}</strong>
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            Payment Method: {order.payment.method}
                                        </div>
                                        {order.discount.couponCode && (
                                            <div className="text-sm text-green-700 dark:text-green-400">
                                                Discount: {order.discount.couponCode} (${order.discount.discountAmount.toFixed(2)})
                                            </div>
                                        )}
                                        {order.shipping.shippingCost > 0 && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Shipping: ${order.shipping.shippingCost.toFixed(2)}
                                            </div>
                                        )}
                                    </div>

                                    {order.review && (
                                        <div className="mt-2 border-t pt-3">
                                            <p className="text-xs text-gray-500 mb-1">Review:</p>
                                            <div className="flex items-center gap-2 mb-1">
                                                {renderStars(order.review.starRating)}
                                                <span className="text-xs text-gray-500">
                                                    {dayjs(order.review.dateReviewed).format('DD MMM YYYY')}
                                                </span>
                                            </div>
                                            <p className="text-sm italic text-gray-700 dark:text-gray-300">"{order.review.message}"</p>
                                        </div>
                                    )}

                                    <div className="border-t pt-2 mt-2">
                                        <p className="text-xs text-gray-500 mb-2">Products:</p>
                                        <div className="flex flex-col gap-3">
                                            {order.products.map((product, i) => {
                                                const p = product.correspondingProduct as Product | undefined;
                                                const imageUrl = p?.getImageThumbnail?.() || '/placeholder.jpg';

                                                return (
                                                    <div
                                                        key={i}
                                                        className="flex items-start gap-3 border rounded p-2 bg-white dark:bg-gray-900 shadow-sm"
                                                    >
                                                        <img
                                                            src={imageUrl}
                                                            alt={p?.name || product.productName}
                                                            className="w-12 h-12 object-cover rounded border"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = '/placeholder.jpg';
                                                            }}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                                {p ? p.getNameWithCategory?.() : product.productName}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                SKU: {product.sku} | Qty: {product.quantity} | ${product.price.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Dialog>

            <Loading loading={loading}>
                {tableData.total !== 0 && (
                    <div className="w-2/3">
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

export default FollowupOrdersTable
