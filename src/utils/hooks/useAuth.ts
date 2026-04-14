import { apiSignIn, apiSignOut, apiSignUp } from '@/services/AuthService'
import {
    setAuthChecked,
    setUser,
    signInSuccess,
    signOutSuccess,
    useAppSelector,
    useAppDispatch,
} from '@/store'
import { RootState } from '@/store'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useNavigate } from 'react-router-dom'
import useQuery from './useQuery'
import type { SignInCredential, SignUpCredential } from '@/@types/auth'
import type { User as FirebaseUser } from 'firebase/auth'

type Status = 'mfa-required' | 'success' | 'failed'

type SignInResponse =
    | { status: 'success'; message: string }
    | { status: 'failed'; message: string }
    | { status: 'mfa-required'; message: string; resolver: any }

function useAuth() {
    const dispatch = useAppDispatch()

    const navigate = useNavigate()

    const query = useQuery()

    const { token, signedIn, uid, authChecked } = useAppSelector(
        (state: RootState) => state.auth.session
    )

    const applyFirebaseUserSession = async (firebaseUser: FirebaseUser) => {
        const idToken = await firebaseUser.getIdToken().catch(() => null)

        dispatch(
            signInSuccess({
                uid: firebaseUser.uid,
                token: idToken,
            })
        )

        dispatch(
            setUser({
                avatar: firebaseUser.photoURL || '',
                userName: firebaseUser.displayName || 'Anonymous',
                authority: ['USER'],
                email: firebaseUser.email || '',
            })
        )
    }

    const signIn = async (values: SignInCredential): Promise<SignInResponse> => {
        try {
            const resp = await apiSignIn(values)

            if (resp.mfaRequired) {
                console.log("MFA required:", resp.resolver)
                return {
                    status: 'mfa-required',
                    message: 'MFA required',
                    resolver: resp.resolver,
                }
            }

            if (resp.success) {
                const { user } = resp
                if (user) {
                    await applyFirebaseUserSession(user)
                    const redirectUrl = query.get(REDIRECT_URL_KEY)
                    navigate(
                        redirectUrl
                            ? redirectUrl
                            : appConfig.authenticatedEntryPath
                    )
                }

                return { status: 'success', message: '' }
            } else {
                return { status: 'failed', message: resp.error || 'Unknown error' }
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                return { status: 'failed', message: error.message }
            }
            return { status: 'failed', message: 'An unknown error occurred' }
        }
    }

    const signUp = async (values: SignUpCredential) => {
        try {
            const resp = await apiSignUp(values)

            if (resp.success) {
                const { user } = resp

                if (user) {
                    await applyFirebaseUserSession(user)
                    const redirectUrl = query.get(REDIRECT_URL_KEY)
                    navigate(
                        redirectUrl
                            ? redirectUrl
                            : appConfig.authenticatedEntryPath
                    )
                }

                return { status: 'success', message: '' }
            } else {
                return { status: 'failed', message: resp.error || 'Unknown error' }
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                return { status: 'failed', message: error.message }
            }
            return { status: 'failed', message: 'An unknown error occurred' }
        }
    }

    const handleSignOut = () => {
        dispatch(signOutSuccess())
        dispatch(
            setUser({
                avatar: '',
                userName: '',
                email: '',
                authority: [],
            }),
        )
        dispatch(setAuthChecked(true))
        navigate(appConfig.unAuthenticatedEntryPath)
    }

    const signOut = async () => {
        await apiSignOut()
        handleSignOut()
    }

    return {
        authenticated: Boolean((token || uid) && signedIn),
        authChecked,
        signIn,
        signUp,
        signOut,
    }
}

export default useAuth
