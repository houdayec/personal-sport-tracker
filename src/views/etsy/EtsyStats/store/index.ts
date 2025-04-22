import { combineReducers } from '@reduxjs/toolkit'
import reducers, {
    SLICE_NAME,
    EtsySalesDashboardState,
} from './etsySalesDashboardSlice'
import { useSelector } from 'react-redux'

import type { TypedUseSelectorHook } from 'react-redux'
import type { RootState } from '@/store'

const reducer = combineReducers({
    data: reducers,
})

export const useAppSelector: TypedUseSelectorHook<
    RootState & {
        [SLICE_NAME]: {
            data: EtsySalesDashboardState
        }
    }
> = useSelector

export * from './etsySalesDashboardSlice'
export { useAppDispatch } from '@/store'
export default reducer
