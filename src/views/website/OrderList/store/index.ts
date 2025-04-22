import { combineReducers } from '@reduxjs/toolkit'
import orderReducers, { ORDERS_SLICE_NAME, SalesOrderListState } from './orderListSlice'
import reducers, { LICENSES_ORDERS_SLICE_NAME, LicensesOrderListState } from './licensesOrderListSlice' // ✅ Import licensesOrder slice
import { useSelector } from 'react-redux'

import type { TypedUseSelectorHook } from 'react-redux'
import type { RootState } from '@/store'

// ✅ Combine multiple slices
const reducer = combineReducers({
    orders: orderReducers, // ✅ No extra nesting
    data: reducers, // ✅ No extra nesting
})

export const useAppSelector: TypedUseSelectorHook<
    RootState & {
        [ORDERS_SLICE_NAME]: {
            orders: SalesOrderListState
        }
        [LICENSES_ORDERS_SLICE_NAME]: {
            data: LicensesOrderListState
        }
    }
> = useSelector

export * from './orderListSlice'
export * from './licensesOrderListSlice'
export { useAppDispatch } from '@/store'
export default reducer
