import { useEffect, useCallback, useMemo, useRef } from 'react'
import Badge from '@/components/ui/Badge'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import { HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { NumericFormat } from 'react-number-format'
import { addRowItem, getOrders, removeRowItem, setDeleteMode, setSelectedRow, setSelectedRows, setTableData } from '../store/orderListSlice'
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
import { useAppDispatch, useAppSelector } from '../store'
import { WooOrder } from '@/@types/woo_order'

const orderStatusColor: Record<
    number,
    {
        label: string
        dotClass: string
        textClass: string
    }
> = {
    0: {
        label: 'Paid',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-500',
    },
    1: {
        label: 'Pending',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-500',
    },
    2: { label: 'Failed', dotClass: 'bg-red-500', textClass: 'text-red-500' },
}

const PaymentMethodImage = ({
    paymentMehod,
    className,
}: {
    paymentMehod: string
    className: string
}) => {
    switch (paymentMehod) {
        case 'visa':
            return (
                <img
                    className={className}
                    src="/img/others/img-8.png"
                    alt={paymentMehod}
                />
            )
        case 'master':
            return (
                <img
                    className={className}
                    src="/img/others/img-9.png"
                    alt={paymentMehod}
                />
            )
        case 'paypal':
            return (
                <img
                    className={className}
                    src="/img/others/img-10.png"
                    alt={paymentMehod}
                />
            )
        default:
            return <></>
    }
}

const OrderColumn = ({ row }: { row: WooOrder }) => {
    const { textTheme } = useThemeClass()
    const navigate = useNavigate()

    const onView = useCallback(() => {
        navigate(`/website/orders/order-details/${row.id}`)
    }, [navigate, row])

    return (
        <span
            className={`cursor-pointer select-none font-semibold hover:${textTheme}`}
            onClick={onView}
        >
            #{row.id}
        </span>
    )
}

const ActionColumn = ({ row }: { row: WooOrder }) => {
    const dispatch = useAppDispatch()
    const { textTheme } = useThemeClass()
    const navigate = useNavigate()

    const onDelete = () => {
        dispatch(setDeleteMode('single'))
        dispatch(setSelectedRow([row.id]))
    }

    const onView = useCallback(() => {
        navigate(`/website/orders/order-details/${row.id}`)
    }, [navigate, row])

    return (
        <div className="flex justify-end text-lg">
            <Tooltip title="View">
                <span
                    className={`cursor-pointer p-2 hover:${textTheme}`}
                    onClick={onView}
                >
                    <HiOutlineEye />
                </span>
            </Tooltip>
        </div>
    )
}

const OrdersTable = () => {
    const tableRef = useRef<DataTableResetHandle>(null)

    const dispatch = useAppDispatch()

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.salesOrderList.orders.tableData,
    )
    const loading = useAppSelector((state) => state.salesOrderList.orders.loading)

    const data = useAppSelector((state) => state.salesOrderList.orders.orderList)

    const fetchData = useCallback(() => {
        dispatch(getOrders({ pageIndex, pageSize, sort, query }));
    }, [dispatch, pageIndex, pageSize, sort, query]);

    useEffect(() => {
        dispatch(setSelectedRows([]))
        fetchData()
    }, [dispatch, fetchData, pageIndex, pageSize, sort])

    useEffect(() => {
        if (tableRef) {
            tableRef.current?.resetSelected()
        }
    }, [data])

    const tableData = useMemo(
        () => ({ pageIndex, pageSize, sort, query, total }),
        [pageIndex, pageSize, sort, query, total],
    )

    const columns: ColumnDef<WooOrder>[] = useMemo(
        () => [
            {
                header: 'Order',
                accessorKey: 'id',
                cell: (props) => <OrderColumn row={props.row.original} />,
            },
            {
                header: 'Date',
                accessorKey: 'date',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <span>{dayjs(row.date).format('DD/MM/YYYY')}</span>
                    )
                },
            },
            {
                header: 'Customer',
                accessorKey: 'customer',
            },
            {
                header: 'Email',
                accessorKey: 'customerEmail',
            },
            {
                header: 'Products',
                accessorKey: 'products',
                cell: (props) => {
                    const { products } = props.row.original;

                    return (
                        <div>
                            {products.map((product, index) => (
                                <div key={index} className="mb-1">
                                    <span className="font-semibold">{product.productName}</span>
                                    <span className="text-gray-500 text-sm"> (SKU: {product.sku})</span>
                                    <span className="ml-2">x{product.quantity}</span>
                                </div>
                            ))}
                        </div>
                    );
                },
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => {
                    const { status } = props.row.original
                    return (
                        <div className="flex items-center">
                            <Badge
                                className={orderStatusColor[status].dotClass}
                            />
                            <span
                                className={`ml-2 rtl:mr-2 capitalize font-semibold ${orderStatusColor[status].textClass}`}
                            >
                                {orderStatusColor[status].label}
                            </span>
                        </div>
                    )
                },
            },
            {
                header: 'Payment Method',
                accessorKey: 'paymentMethod',
            },
            {
                header: 'Total',
                accessorKey: 'totalAmount',
                cell: (props) => {
                    const { totalAmount } = props.row.original
                    return (
                        <NumericFormat
                            displayType="text"
                            value={(
                                Math.round(totalAmount * 100) / 100
                            ).toFixed(2)}
                            prefix={'$'}
                            thousandSeparator={true}
                        />
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => <ActionColumn row={props.row.original} />,
            },
        ],
        [],
    )

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

    const onRowSelect = (checked: boolean, row: WooOrder) => {
        if (checked) {
            dispatch(addRowItem([row.id]))
        } else {
            dispatch(removeRowItem(row.id))
        }
    }

    const onAllRowSelect = useCallback(
        (checked: boolean, rows: Row<WooOrder>[]) => {
            if (checked) {
                const originalRows = rows.map((row) => row.original)
                const selectedIds: string[] = []
                originalRows.forEach((row) => {
                    selectedIds.push(row.id)
                })
                dispatch(setSelectedRows(selectedIds))
            } else {
                dispatch(setSelectedRows([]))
            }
        },
        [dispatch],
    )

    return (
        <DataTable
            ref={tableRef}
            //selectable
            columns={columns}
            data={data}
            loading={loading}
            pagingData={{
                total: tableData.total as number,
                pageIndex: tableData.pageIndex as number,
                pageSize: tableData.pageSize as number,
            }}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            onSort={onSort}
            //onCheckBoxChange={onRowSelect}
            onIndeterminateCheckBoxChange={onAllRowSelect}
        />
    )
}

export default OrdersTable
