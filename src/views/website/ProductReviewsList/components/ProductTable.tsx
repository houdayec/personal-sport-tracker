import { useEffect, useMemo, useRef } from 'react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/shared/DataTable'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import { FiPackage } from 'react-icons/fi'
import {
    getProducts,
    setTableData,
    setSelectedProduct,
    toggleDeleteConfirmation,
    useAppDispatch,
    useAppSelector,
} from '../store'
import useThemeClass from '@/utils/hooks/useThemeClass'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import type {
    DataTableResetHandle,
    OnSortParam,
    ColumnDef,
} from '@/components/shared/DataTable'
import { Product } from '@/@types/product'
import { Tag } from '@/components/ui'

const ProductType = ({ category }: { category: string }) => {
    switch (category) {
        case "font":
            return (
                <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100  border-0 rounded">
                    Font
                </Tag>
            )
        case "football_font":
            return (
                <Tag className="text-amber-600 bg-amber-100 dark:text-amber-100 dark:bg-amber-500/20  border-0 rounded">
                    Football Font
                </Tag>
            )
        case "football_font_bundle":
            return (
                <Tag className="text-amber-600 bg-amber-100 dark:text-amber-100 dark:bg-amber-500/20  border-0 rounded">
                    Football Font Bundle
                </Tag>
            )
        case "font_bundle":
            return (
                <Tag className="text-amber-600 bg-amber-100 dark:text-amber-100 dark:bg-amber-500/20  border-0 rounded">
                    Font Bundle
                </Tag>
            )
        case "vector_font":
            return (
                <Tag className="text-amber-600 bg-amber-100 dark:text-amber-100 dark:bg-amber-500/20  border-0 rounded">
                    Image Font
                </Tag>
            )
        case "license":
            return (
                <Tag className="text-amber-600 bg-amber-100 dark:text-amber-100 dark:bg-amber-500/20  border-0 rounded">
                    License
                </Tag>
            )
        default:
            return <Tag className="rounded-md">Non définie</Tag>
    }
}

const ActionColumn = ({ row }: { row: Product }) => {
    const dispatch = useAppDispatch()
    const { textTheme } = useThemeClass()
    const navigate = useNavigate()

    const onEdit = () => {
        navigate(`/products/${row.sku}/edit`)
    }

    const onDelete = () => {
        dispatch(toggleDeleteConfirmation(true))
        dispatch(setSelectedProduct(row.sku))
    }

    return (
        <div className="flex justify-end text-lg">
            <span
                className={`cursor-pointer p-2 hover:${textTheme}`}
                onClick={onEdit}
            >
                <HiOutlinePencil />
            </span>
        </div>
    )
}

const ProductColumn = ({ row }: { row: Product }) => {
    const avatar = row.getImageThumbnail() ? (
        <Avatar src={row.getImageThumbnail()} />
    ) : (
        <Avatar icon={<FiPackage />} />
    )

    return (
        <div className="flex items-center">
            {avatar}
            <span className={`ml-2 rtl:mr-2 font-semibold`}>{row.name}</span>
        </div>
    )
}

const ProductTable = () => {
    const tableRef = useRef<DataTableResetHandle>(null)

    const dispatch = useAppDispatch()

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.reviewsProductList.data.tableData,
    )

    const filterData = useAppSelector(
        (state) => state.reviewsProductList.data.filterData,
    )

    const loading = useAppSelector(
        (state) => state.reviewsProductList.data.loading,
    )

    const data = useAppSelector(
        (state) => state.reviewsProductList.data.productList,
    )

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex, pageSize, sort])

    useEffect(() => {
        if (tableRef) {
            tableRef.current?.resetSorting()
        }
    }, [filterData])

    const tableData = useMemo(
        () => ({ pageIndex, pageSize, sort, query, total }),
        [pageIndex, pageSize, sort, query, total],
    )

    const fetchData = () => {
        dispatch(getProducts({ pageIndex, pageSize, sort, query, filterData }))
    }

    const columns: ColumnDef<Product>[] = useMemo(
        () => [
            {
                header: 'SKU',
                accessorKey: 'sku',
                sortable: true,
            },
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    return <ProductColumn row={row} />
                },
            },
            {
                header: 'Category',
                accessorKey: 'category',
                cell: (props) => {
                    const row = props.row.original
                    return <ProductType category={row.category} />
                },
            },
            {
                header: 'Last Update',
                accessorKey: 'wordpressReviewUpdatedAt',
                cell: (props) => {
                    const timestamp = props.row.original.wordpressReviewUpdatedAt;

                    if (!timestamp) return "N/A"; // Handle missing timestamps

                    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds

                    const formattedDate = date.toLocaleDateString("en-GB", {
                        weekday: "short", // "Wed"
                        day: "2-digit", // "19"
                        month: "long", // "March"
                        year: "numeric", // "2025"
                    });

                    return formattedDate;
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

    return (
        <>
            <DataTable
                ref={tableRef}
                columns={columns}
                data={data}
                skeletonAvatarColumns={[0]}
                skeletonAvatarProps={{ className: 'rounded-md' }}
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
        </>
    )
}

export default ProductTable
