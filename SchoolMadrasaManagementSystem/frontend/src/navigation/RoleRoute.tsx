import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { UnauthorizedPage } from '../pages/errors/UnauthorizedPage'
import { canAccessPath } from './access'

interface RoleRouteProps {
    children: ReactNode
}

export function RoleRoute({ children }: RoleRouteProps) {
    const role = useAuthStore((state) => state.user?.role)
    const enabledModules = useAuthStore((state) => state.user?.enabledModules)
    const location = useLocation()

    if (!canAccessPath(location.pathname, role, enabledModules)) {
        return <UnauthorizedPage />
    }

    return <>{children}</>
}