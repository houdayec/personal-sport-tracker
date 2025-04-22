import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import {
    setSelectedRows,
    addRowItem,
    removeRowItem,
    setTableData,
    useAppDispatch,
    useAppSelector,
    getEtsyRankings,
} from '../store'
import useThemeClass from '@/utils/hooks/useThemeClass'
import cloneDeep from 'lodash/cloneDeep'
import dayjs from 'dayjs'
import type {
    DataTableResetHandle,
    OnSortParam,
    ColumnDef,
    Row,
} from '@/components/shared/DataTable'
import { Avatar } from '@/components/ui'
import DataTableWithPaginationBottom from '@/components/shared/DataTableWithPaginationBottom'
import { DoubleSidedImage, Loading } from '@/components/shared'
import { EtsyReview } from '@/@types/etsy_review'
import { FiPackage } from 'react-icons/fi'
import { SearchQuery } from '@/shared/search_query'


const EtsyRankingsTable = () => {
    const tableRef = useRef<DataTableResetHandle>(null)

    const dispatch = useAppDispatch()

    const { pageIndex, pageSize, sort, query, total } = useAppSelector(
        (state) => state.etsyRankingsSlice.data.tableData,
    )
    const loading = useAppSelector((state) => state.etsyRankingsSlice.data.loading)
    const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({}); // Track follow-up status

    const data = useAppSelector((state) => state.etsyRankingsSlice.data.rankingsList)
    const { textTheme } = useThemeClass()

    const fetchData = useCallback(() => {
        console.log('{ pageIndex, pageSize, sort, query }', {
            pageIndex,
            pageSize,
            sort,
            query,
        })
        dispatch(getEtsyRankings({ pageIndex, pageSize, sort, query }))
    }, [dispatch, pageIndex, pageSize, sort, query])

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

    const columns: ColumnDef<SearchQuery | { type: 'header'; date: string; count: number }>[] = useMemo(() => [
        {
            header: 'Search Query',
            accessorKey: 'query',
            cell: ({ row }) => {
                const q = row.original as SearchQuery;
                return (
                    <div className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                        {q.query}
                    </div>
                );
            },
        },
        {
            header: 'Latest Rank',
            accessorKey: 'latestRank',
            cell: ({ row }) => {
                const q = row.original as SearchQuery;
                const latest = q.history?.[0]?.listings?.find(l => l.brand === "FontMaze");
                const previous = q.history?.[1]?.listings?.find(l => l.brand === "FontMaze");
                const earlier = q.history?.[2]?.listings?.find(l => l.brand === "FontMaze");

                const latestRank = latest?.position ?? "–";
                const previousRank = previous?.position ?? null;
                const earlierRank = earlier?.position ?? null;

                const trend = latestRank && previousRank
                    ? Number(latestRank) < Number(previousRank)  // Convert both to numbers for comparison
                        ? 'up'  // Green arrow
                        : (Number(latestRank) === Number(previousRank) ? 'same' : 'down')  // Gray or Red arrow
                    : 'same';

                const badgeColor = trend === 'up'
                    ? 'bg-green-500'
                    : trend === 'down'
                        ? 'bg-red-500'
                        : 'bg-gray-500'; // Neutral/No change

                const trendSymbol = trend === 'up'
                    ? '↑'  // Green Arrow
                    : trend === 'down'
                        ? '↓'  // Red Arrow
                        : '→';  // Gray Arrow

                return (
                    <div className="flex items-center gap-2">
                        {/* Rank Badge */}
                        <span
                            className={`text-sm font-medium text-white rounded-full w-6 h-6 flex items-center justify-center 
                            ${latestRank === 1 ? 'bg-yellow-300' :
                                    latestRank === 2 ? 'bg-gray-400' :
                                        latestRank === 3 ? 'bg-yellow-600' :
                                            'bg-red-500'}`}
                        >
                            {latestRank}
                        </span>

                        {/* Trend Arrow */}
                        <span className={`text-xl ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Last 3 Positions',
            accessorKey: 'lastPositions',
            cell: ({ row }) => {
                const q = row.original as SearchQuery;
                const positions = q.history.slice(0, 3).map(snapshot => {
                    const latest = snapshot.listings.find(l => l.brand === "FontMaze");
                    return latest?.position ?? "–";
                });

                return (
                    <div className="flex items-center gap-2 text-sm">
                        {positions.map((position, index) => (
                            <span key={index} className="px-2 py-1 rounded bg-gray-200 text-gray-800">
                                {position}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            header: 'Etsy Search',
            accessorKey: 'etsySearchUrl',
            cell: ({ row }) => {
                const q = row.original as SearchQuery;
                const searchUrl = `https://www.etsy.com/search?q=${encodeURIComponent(q.query)}`;

                return (
                    <a
                        href={searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Open Search
                    </a>
                );
            }
        }

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

    const onRowSelect = (checked: boolean, row: SearchQuery) => {
        if (checked) {
            dispatch(addRowItem([row.id]))
        } else {
            dispatch(removeRowItem(row.id))
        }
    }

    const onAllRowSelect = useCallback(
        (checked: boolean, rows: Row<SearchQuery>[]) => {
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
        <>
            <Loading loading={loading}>
                {tableData.total !== 0 && (
                    <div>
                        <DataTableWithPaginationBottom
                            ref={tableRef}
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

export default EtsyRankingsTable
