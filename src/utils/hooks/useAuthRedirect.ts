import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useAppDispatch } from '@/store'
import { setAuthChecked, setUser, signInSuccess, signOutSuccess } from '@/store'
import { auth } from '@/firebase'

const useAuthRedirect = () => {
    const dispatch = useAppDispatch()

    useEffect(() => {
        dispatch(setAuthChecked(false))

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                dispatch(signOutSuccess())
                dispatch(
                    setUser({
                        avatar: '',
                        userName: '',
                        email: '',
                        authority: [],
                    })
                )
                return
            }

            const token = await firebaseUser.getIdToken().catch(() => null)

            dispatch(
                signInSuccess({
                    uid: firebaseUser.uid,
                    token,
                })
            )
            dispatch(
                setUser({
                    avatar: firebaseUser.photoURL || '',
                    userName: firebaseUser.displayName || 'Anonymous',
                    authority: ['USER', firebaseUser.uid],
                    email: firebaseUser.email || '',
                })
            )
        })

        return () => unsubscribe()
    }, [dispatch])
}

export default useAuthRedirect
