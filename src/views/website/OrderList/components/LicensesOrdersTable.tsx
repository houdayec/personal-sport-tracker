import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import { HiOutlineCheckCircle, HiOutlineClipboardCheck, HiOutlineDocumentText, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { NumericFormat } from 'react-number-format'

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
import { addLicensesRowItem, getLicensesOrders, LicenseOrder, removeLicensesRowItem, setLicensesDeleteMode, setLicensesSelectedRow, setLicensesSelectedRows, setLicensesTableData, updateLicenseOrderStatus } from '../store/licensesOrderListSlice'
import { useAppDispatch, useAppSelector } from '../store'
import { markOrderAsCompleted } from '@/services/SalesService'
import { Tag } from '@/components/ui'

const DeliveryStatus = ({ licenseDelivered }: { licenseDelivered: boolean }) => {
    switch (licenseDelivered) {
        case true:
            return (
                <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100  border-0 rounded">
                    Completed
                </Tag>
            )
        case false:
            return (
                <Tag className="text-amber-600 bg-amber-100 dark:text-amber-100 dark:bg-amber-500/20  border-0 rounded">
                    To deliver
                </Tag>
            )
    }
}

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

const OrderColumn = ({ row }: { row: LicenseOrder }) => {
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

const ActionColumn = ({ row }: { row: LicenseOrder }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [isCompleted, setIsCompleted] = useState(row.licenseDelivered === true);

    const onDelete = () => {
        dispatch(setLicensesDeleteMode("single"));
        dispatch(setLicensesSelectedRow([row.id]));
    };

    const onView = useCallback(() => {
        navigate(`/website/orders/order-details/${row.id}`);
    }, [navigate, row]);

    const onUpdateStatus = async () => {
        if (!isCompleted) {
            const success = await markOrderAsCompleted(row.id);
            if (success) {
                setIsCompleted(true); // ✅ Update state to reflect completion
                dispatch(updateLicenseOrderStatus({ orderId: row.id, licenseDelivered: true }));
            }
        }
    }

    const onGenerateLicense = () => {
        if (!row.products.length) return; // Ensure there is at least one product

        const licenseSku = row.products[0].sku; // Assuming first product SKU is main
        const dateOfIssue = new Date(row.date).toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
        const ownerEmail = encodeURIComponent(row.customerEmail); // Encode to avoid special character issues

        // Construct the URL with parameters
        const licenseUrl = `/tools/licenses?orderId=${row.id}&licenseSku=${licenseSku}&dateOfIssue=${dateOfIssue}&ownerEmail=${ownerEmail}`;

        window.open(licenseUrl, "_blank"); // Opens new tab with license generation
    };

    return (
        <div className="flex justify-end text-lg">
            {/* View Button */}
            <Tooltip title="View Order">
                <span className="cursor-pointer p-2 hover:text-blue-600" onClick={onView}>
                    <HiOutlineEye />
                </span>
            </Tooltip>

            {/* Generate License Button */}
            <Tooltip title="Generate License">
                <span className="cursor-pointer p-2 hover:text-blue-600" onClick={onGenerateLicense}>
                    <HiOutlineDocumentText />
                </span>
            </Tooltip>

            {/* Mark as Completed Button */}
            <Tooltip title={isCompleted ? "Already completed!" : "Mark as completed"}>
                <span
                    className={`p-2 ${isCompleted ? "text-emerald-500 cursor-not-allowed" : "cursor-pointer hover:text-blue-600"}`}
                    onClick={onUpdateStatus}
                >
                    {isCompleted ? <HiOutlineCheckCircle /> : <HiOutlineClipboardCheck />}
                </span>
            </Tooltip>
        </div>
    );
};

const LicensesOrdersTable = () => {
    const tableRef = useRef<DataTableResetHandle>(null)

    const dispatch = useAppDispatch()
    const reduxState = useAppSelector((state) => state);
    console.log("✅ Redux State:", reduxState);

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.licensesOrderList.data.tableData
    )
    const loading = useAppSelector((state) => state.licensesOrderList.data.loading)

    const data = useAppSelector((state) => state.licensesOrderList.data.orderList)

    const fetchData = useCallback(() => {
        if (data.length === 0) {
            console.log('Fetching Data: ', { pageIndex, pageSize, sort, query });
            dispatch(getLicensesOrders({ pageIndex, pageSize, sort, query }));
        } else {
            console.log("✅ Data already loaded, skipping fetch.");
        }
    }, [dispatch, pageIndex, pageSize, sort, query, data]);

    useEffect(() => {
        dispatch(setLicensesSelectedRows([]))
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

    const columns: ColumnDef<LicenseOrder>[] = useMemo(
        () => [
            {
                header: 'Order Info',
                accessorKey: 'id',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className="font-semibold text-sm">#{row.id}</div>
                            <div className="text-xs text-gray-500">{dayjs(row.date).format('DD MMM YYYY')}</div>
                        </div>
                    )
                },
            },
            {
                header: 'Customer',
                accessorKey: 'customer',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className="font-semibold">{row.customer}</div>
                            <div className="text-xs text-gray-500">{row.customerEmail}</div>
                        </div>
                    )
                },
            },
            {
                header: 'Order Summary',
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className={`font-semibold ${orderStatusColor[row.status].textClass}`}>
                                {orderStatusColor[row.status].label}
                            </div>
                            <div className="text-xs text-gray-500">
                                <NumericFormat
                                    displayType="text"
                                    value={row.totalAmount.toFixed(2)}
                                    prefix={'$'}
                                    thousandSeparator={true}
                                />
                            </div>
                        </div>
                    )
                },
            },
            {
                header: 'Delivery',
                accessorKey: 'isCompleted',
                cell: (props) => {
                    const { licenseDelivered } = props.row.original;
                    return <DeliveryStatus licenseDelivered={licenseDelivered} />
                },
            },
            {
                header: 'Products',
                accessorKey: 'products',
                cell: (props) => {
                    const { products } = props.row.original
                    return (
                        <div>
                            {products.map((p, idx) => (
                                <div key={idx} className="mb-1 text-sm">
                                    <span className="font-medium">{p.productName}</span>
                                    <span className="text-xs text-gray-500 ml-2">({p.sku})</span>
                                    <span className="ml-2 text-xs">x{p.quantity}</span>
                                </div>
                            ))}
                        </div>
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
        dispatch(setLicensesTableData(newTableData))
    }

    const onSelectChange = (value: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageSize = Number(value)
        newTableData.pageIndex = 1
        dispatch(setLicensesTableData(newTableData))
    }

    const onSort = (sort: OnSortParam) => {
        const newTableData = cloneDeep(tableData)
        newTableData.sort = sort
        dispatch(setLicensesTableData(newTableData))
    }

    const onRowSelect = (checked: boolean, row: LicenseOrder) => {
        if (checked) {
            dispatch(addLicensesRowItem([row.id]))
        } else {
            dispatch(removeLicensesRowItem(row.id))
        }
    }

    const onAllRowSelect = useCallback(
        (checked: boolean, rows: Row<LicenseOrder>[]) => {
            if (checked) {
                const originalRows = rows.map((row) => row.original)
                const selectedIds: string[] = []
                originalRows.forEach((row) => {
                    selectedIds.push(row.id)
                })
                dispatch(setLicensesSelectedRows(selectedIds))
            } else {
                dispatch(setLicensesSelectedRows([]))
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

export default LicensesOrdersTable

