import { Navigate, Outlet, useLocation } from 'react-router-dom'
import appConfig from '@/configs/app.config'
import useAuth from '@/utils/hooks/useAuth'
import Loading from '@/components/shared/Loading'

const { authenticatedEntryPath } = appConfig
const AUTH_PUBLIC_EXCEPTIONS = new Set(['/forgot-password', '/reset-password'])

const PublicRoute = () => {
    const { authenticated, authChecked } = useAuth()
    const location = useLocation()

    if (!authChecked) {
        return <Loading loading={true} />
    }

    const canAccessWhenAuthenticated = AUTH_PUBLIC_EXCEPTIONS.has(
        location.pathname,
    )

    if (authenticated && !canAccessWhenAuthenticated) {
        return <Navigate to={authenticatedEntryPath} />
    }

    return <Outlet />
}

export default PublicRoute
