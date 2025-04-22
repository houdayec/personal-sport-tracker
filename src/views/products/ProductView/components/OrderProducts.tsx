import { Fragment } from 'react'
import AdaptableCard from '@/components/shared/AdaptableCard'
import Table from '@/components/ui/Table'
import Avatar from '@/components/ui/Avatar'
import { Button } from "@/components/ui/Button";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { NumericFormat } from 'react-number-format'
import isLastChild from '@/utils/isLastChild'
import { FaGoogleDrive } from "react-icons/fa";
import { Product } from '@/@types/product';

type OrderProductsProps = {
    data?: Product
}

const { Tr, Th, Td, THead, TBody } = Table

const columnHelper = createColumnHelper<Product>()

const ProductColumn = ({ row }: { row: Product }) => {


    const onClick = () => {
        const searchUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(row.productCode)}`;

        // Simulate loading effect before opening Google Drive
        setTimeout(() => {
            window.open(searchUrl, "_blank");
        }, 1000);
    };

    return (

        <div className="flex items-center">
            <Avatar size={90} src={row.getImageThumbnail()} className='mr-2' />
            <div className="ltr:ml-2 rtl:mr-2">
                <h6 className="mb-2">{row.name}</h6>
                <Button
                    variant="twoTone"
                    onClick={onClick}
                    className="mr-2"
                    icon={<FaGoogleDrive />}
                >
                    <span>Google Drive</span>
                </Button>
            </div>
        </div>


    )
}

const PriceAmount = ({ amount }: { amount: number }) => {
    return (
        <NumericFormat
            displayType="text"
            value={(Math.round(amount * 100) / 100).toFixed(2)}
            prefix={'$'}
            thousandSeparator={true}
        />
    )
}

const columns = [
    columnHelper.accessor('name', {
        header: 'Product',
        cell: (props) => {
            const row = props.row.original
            return <ProductColumn row={row} />
        },
    }),
    columnHelper.accessor('price', {
        header: 'Price',
        cell: (props) => {
            const row = props.row.original
            return <PriceAmount amount={row.price} />
        },
    }),
    columnHelper.accessor('quantity', {
        header: 'Quantity',
    }),
    columnHelper.accessor('total', {
        header: 'Total',
        cell: (props) => {
            const row = props.row.original
            return <PriceAmount amount={row.price} />
        },
    }),
]

const OrderProducts = ({ data = Product }: OrderProductsProps) => {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <AdaptableCard className="mb-4">
            <Table>
                <THead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <Tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <Th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                    </Th>
                                )
                            })}
                        </Tr>
                    ))}
                </THead>
                <TBody>
                    {table.getRowModel().rows.map((row) => {
                        return (
                            <Tr key={row.id}>
                                {row.getVisibleCells().map((cell) => {
                                    return (
                                        <Td key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </Td>
                                    )
                                })}
                            </Tr>
                        )
                    })}
                </TBody>
            </Table>
        </AdaptableCard>
    )
}

export default OrderProducts
