import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'

export interface SessionState {
    signedIn: boolean
    token: string | null
    uid: string | null
    authChecked: boolean
}

type SignInPayload = {
    token: string | null
    uid: string
}

const initialState: SessionState = {
    signedIn: false,
    token: null,
    uid: null,
    authChecked: false,
}

const sessionSlice = createSlice({
    name: `${SLICE_BASE_NAME}/session`,
    initialState,
    reducers: {
        signInSuccess(state, action: PayloadAction<SignInPayload>) {
            state.signedIn = true
            state.token = action.payload.token
            state.uid = action.payload.uid
            state.authChecked = true
        },
        signOutSuccess(state) {
            state.signedIn = false
            state.token = null
            state.uid = null
            state.authChecked = true
        },
        setAuthChecked(state, action: PayloadAction<boolean>) {
            state.authChecked = action.payload
        },
    },
})

export const { signInSuccess, signOutSuccess, setAuthChecked } =
    sessionSlice.actions
export default sessionSlice.reducer
