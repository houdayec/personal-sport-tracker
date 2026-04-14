import { Navigate, Outlet } from 'react-router-dom'
import appConfig from '@/configs/app.config'
import useAuth from '@/utils/hooks/useAuth'
import Loading from '@/components/shared/Loading'

const { authenticatedEntryPath } = appConfig

const PublicRoute = () => {
    const { authenticated, authChecked } = useAuth()

    if (!authChecked) {
        return <Loading loading={true} />
    }

    return authenticated ? <Navigate to={authenticatedEntryPath} /> : <Outlet />
}

export default PublicRoute
