import { useCallback, useEffect, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
    getCustomers,
    setTableData,
    setSelectedCustomer,
    setDrawerOpen,
    useAppDispatch,
    useAppSelector,
    Customer,
} from '../store'
import DataTable from '@/components/shared/DataTable'
import Avatar from '@/components/ui/Avatar'
import Loading from '@/components/shared/Loading'  // ✅ Import Loading component
import { Badge } from '@/components/ui'
import useThemeClass from '@/utils/hooks/useThemeClass'
import CustomerEditDialog from './CustomerEditDialog'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import cloneDeep from 'lodash/cloneDeep'
import type { OnSortParam, ColumnDef } from '@/components/shared/DataTable'

const customerStatusColor: Record<
    number,
    {
        label: string
        dotClass: string
        textClass: string
    }
> = {
    0: {
        label: 'Guest',
        dotClass: 'bg-gray-500',
        textClass: 'text-gray-500',
    },
    1: {
        label: 'Registered',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-500',
    }
}

const NameColumn = ({ row }: { row: Customer }) => {
    const { textTheme } = useThemeClass()

    return (
        <div className="flex items-center">
            <Avatar size={28} shape="circle" src={row.avatar_url} />
            <Link
                className={`hover:${textTheme} ml-2 rtl:mr-2 font-semibold`}
                to={`/app/crm/customer-details?id=${row.id}`}
            >
                {row.first_name} {row.last_name}
            </Link>
        </div>
    )
}

const CustomersTable = () => {
    const dispatch = useAppDispatch()
    const data = useAppSelector((state) => state.customers.data.customerList)
    const loading = useAppSelector((state) => state.customers.data.loading)
    const filterData = useAppSelector(
        (state) => state.customers.data.filterData,
    )

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.customers.data.tableData,
    )
    const fetchData = useCallback(() => {
        dispatch(getCustomers({ pageIndex, pageSize, sort, query, filterData }))
    }, [pageIndex, pageSize, sort, query, filterData, dispatch])

    useEffect(() => {
        fetchData()
    }, [fetchData, pageIndex, pageSize, sort, filterData])

    const tableData = useMemo(
        () => ({ pageIndex, pageSize, sort, query, total }),
        [pageIndex, pageSize, sort, query, total],
    )

    // ✅ Define table columns with explicit typing
    const columns: ColumnDef<Customer>[] = [
        {
            header: 'Name',
            accessorKey: 'name',
            cell: (props) => {
                const row = props.row.original
                return <NameColumn row={row} />
            },
        },
        {
            header: 'Email',
            accessorKey: 'email',
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (props) => {
                const { status } = props.row.original
                return (
                    <div className="flex items-center gap-2">
                        <Badge
                            className={
                                customerStatusColor[status].dotClass
                            }
                        />
                        <span
                            className={`capitalize font-semibold ${customerStatusColor[status].textClass}`}
                        >
                            {customerStatusColor[status].label}
                        </span>
                    </div>
                )
            },
        }
    ]

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

    return (
        <DataTable
            columns={columns}
            data={data}
            skeletonAvatarColumns={[0]}
            skeletonAvatarProps={{ width: 28, height: 28 }}
            loading={loading}
            pagingData={{
                total: tableData.total as number,
                pageIndex: tableData.pageIndex as number,
                pageSize: tableData.pageSize as number,
            }}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            onSort={onSort}
        />
    )
}

export default CustomersTable
