import { useRef } from "react";
import Input from "@/components/ui/Input";
import { HiOutlineSearch } from "react-icons/hi";
import { Button, InputGroup } from "@/components/ui";
import cloneDeep from "lodash/cloneDeep";
import type { TableQueries } from "@/@types/common";
import { getOrders, setTableData } from "../store/orderListSlice";
import { useAppDispatch, useAppSelector } from "../store";

const OrderTableSearch = () => {
    const dispatch = useAppDispatch();
    const searchInput = useRef<HTMLInputElement>(null);

    const tableData = useAppSelector(
        (state) => state.salesOrderList.orders.tableData
    );

    const fetchData = (data: TableQueries) => {
        dispatch(setTableData(data));
        dispatch(getOrders(data));
    };

    const onSearchClick = () => {
        if (!searchInput.current) return; // Ensure input exists

        const val = searchInput.current.value.trim();
        const newTableData = cloneDeep(tableData);
        newTableData.query = val;
        newTableData.pageIndex = 1;

        if (val.length > 1 || val.length === 0) {
            fetchData(newTableData);
        }
    };

    return (
        <InputGroup
            className="mb-4">
            <Input
                ref={searchInput}
                placeholder="Email or name"
                size="md"
            />
            <Button icon={<HiOutlineSearch className="text-xl" />} size="md" onClick={onSearchClick} />
        </InputGroup>
    );
};

export default OrderTableSearch;