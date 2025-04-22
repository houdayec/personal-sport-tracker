import { combineReducers } from '@reduxjs/toolkit'
import reducers, {
    SLICE_NAME,
    RevenueDashboardState,
} from './revenueDashboardSlice'
import { useSelector } from 'react-redux'

import type { TypedUseSelectorHook } from 'react-redux'
import type { RootState } from '@/store'

const reducer = combineReducers({
    data: reducers,
})

export const useAppSelector: TypedUseSelectorHook<
    RootState & {
        [SLICE_NAME]: {
            data: RevenueDashboardState
        }
    }
> = useSelector

export * from './revenueDashboardSlice'
export { useAppDispatch } from '@/store'
export default reducer
