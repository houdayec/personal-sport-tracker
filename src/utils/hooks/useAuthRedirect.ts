// src/hooks/useAuthRedirect.ts
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/store'
import { signOutSuccess, setUser } from '@/store'
import appConfig from '@/configs/app.config'
import {
    auth,
} from '@/firebase';

const useAuthRedirect = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                console.warn('🔐 No Firebase user found – redirecting to login.')

                // Reset Redux session
                dispatch(signOutSuccess())
                dispatch(
                    setUser({
                        avatar: '',
                        userName: '',
                        email: '',
                        authority: [],
                    })
                )

                // Redirect to login
                navigate(appConfig.unAuthenticatedEntryPath)
            }
        })

        return () => unsubscribe()
    }, [dispatch, navigate])
}

export default useAuthRedirect
