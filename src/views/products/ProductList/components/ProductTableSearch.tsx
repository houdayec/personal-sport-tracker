import { useRef } from 'react'
import Input from '@/components/ui/Input'
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import {
    getProducts,
    setTableData,
    useAppSelector,
    useAppDispatch,
} from '../store'
import debounce from 'lodash/debounce'
import cloneDeep from 'lodash/cloneDeep'
import type { TableQueries } from '@/@types/common'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Button, InputGroup } from '@/components/ui'

const ProductTableSearch = () => {
    const dispatch = useAppDispatch()
    const searchInput = useRef<HTMLInputElement>(null)

    const tableData = useAppSelector(
        (state) => state.salesProductList.data.tableData,
    )

    const debounceFn = debounce((val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        fetchData(newTableData)
    }, 500)

    const fetchData = (data: TableQueries) => {
        dispatch(setTableData(data))
        dispatch(getProducts(data))
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        debounceFn(e.target.value)
    }

    const handleSearchClick = () => {
        const val = searchInput.current?.value.trim() || ''
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        fetchData(newTableData)
    }

    const handleClear = () => {
        if (searchInput.current) {
            searchInput.current.value = ''
            handleSearchClick()
        }
    }

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearchClick()
        }
    }

    return (
        <InputGroup>
            <Input
                ref={searchInput}
                size="sm"
                type="text"
                placeholder="Search product"
                className="border border-gray-300"
                onChange={handleChange}
                onKeyDown={handleKeyPress}
            />
            <Button
                size="sm"
                icon={<HiOutlineSearch />}
                onClick={handleSearchClick}
            />
            <Button
                size="sm"
                icon={<HiOutlineX />}
                onClick={handleClear}
            />
        </InputGroup>
    )
}

export default ProductTableSearch
