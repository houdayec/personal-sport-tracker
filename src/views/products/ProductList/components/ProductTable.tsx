import { useEffect, useMemo, useRef } from 'react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/shared/DataTable'
import { HiOutlineEye, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
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
import ProductDeleteConfirmation from './ProductDeleteConfirmation'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import type {
    DataTableResetHandle,
    OnSortParam,
    ColumnDef,
} from '@/components/shared/DataTable'
import { Product } from '@/@types/product'
import { Tag } from '@/components/ui'

const baseTagClasses = "px-2 py-0.5 text-xs border-0 rounded"

const ProductType = ({ category }: { category: string }) => {
    switch (category) {
        case "font":
            return (
                <Tag className={`${baseTagClasses} bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100`}>
                    Font
                </Tag>
            )
        case "football_font":
            return (
                <Tag className={`${baseTagClasses} bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100`}>
                    Embroidery Font
                </Tag>
            )
        case "football_font_bundle":
            return (
                <Tag className={`${baseTagClasses} bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100`}>
                    Embroidery Font Bundle
                </Tag>
            )
        case "font_bundle":
            return (
                <Tag className={`${baseTagClasses} bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100`}>
                    Font Bundle
                </Tag>
            )
        case "vector_font":
            return (
                <Tag className={`${baseTagClasses} bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100`}>
                    Image Font
                </Tag>
            )
        case "license":
            return (
                <Tag className={`${baseTagClasses} bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100`}>
                    License
                </Tag>
            )
        default:
            return <Tag className={`${baseTagClasses}`}>Non définie</Tag>
    }
}

const ActionColumn = ({ row }: { row: Product }) => {
    const dispatch = useAppDispatch()
    const { textTheme } = useThemeClass()
    const navigate = useNavigate()

    const onView = () => {
        navigate(`/products/${row.sku}`)
    }

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
                onClick={onView}
            >
                <HiOutlineEye />
            </span>
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
    return (
        <div className="flex items-center">
            <span className={`ml-2 rtl:mr-2 font-semibold`}>{row.name}</span>
        </div>
    )
}

const ProductTable = () => {
    const tableRef = useRef<DataTableResetHandle>(null)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.salesProductList.data.tableData,
    )

    const filterData = useAppSelector(
        (state) => state.salesProductList.data.filterData,
    )

    const loading = useAppSelector(
        (state) => state.salesProductList.data.loading,
    )

    const data = useAppSelector(
        (state) => state.salesProductList.data.productList,
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
                header: 'Product',
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    const image = row.getImageThumbnail()

                    return (
                        <div
                            className="flex items-center cursor-pointer rounded"
                            onClick={() => navigate(`/products/${row.sku}`)}
                        >
                            <Avatar src={image} icon={<FiPackage />} size="md" className="w-10 h-10 text-xl"
                            />
                            <div className="ml-4">
                                <div className="font-semibold text-gray-900 dark:text-gray-100">
                                    {row.getNameWithCategory()}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {row.sku}
                                </div>
                                {/* <div className="text-sm text-gray-400">
                                    {row.getCategoryName()}
                                </div> */}
                                {/* <ProductType category={row.category} /> */}
                            </div>
                        </div>
                    )
                },
            }
            ,
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
            <ProductDeleteConfirmation />
        </>
    )
}

export default ProductTable
