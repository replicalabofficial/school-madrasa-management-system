import { LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface HeaderProps {
    onMenuClick: () => void
    sidebarCollapsed: boolean
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
    const user = useAuthStore((state) => state.user)
    const logout = useAuthStore((state) => state.logout)
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    const roleLabel =
        user?.role === 'HeadOfficeAdmin'
            ? 'Head Office'
            : user?.role
                ? 'Branch User'
                : 'School & Madrasa'

    return (
        <header
            className={`fixed right-0 top-0 z-30 h-16 border-b border-slate-200 bg-white transition-all duration-200 ${sidebarCollapsed ? 'left-20' : 'left-64'
                } max-lg:left-0`}
        >
            <div className="flex h-full items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                        aria-label="Open menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold text-slate-800">
                            {user?.fullName ?? 'Management Portal'}
                        </p>
                        <p className="text-xs text-slate-500">{roleLabel}</p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                        {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        aria-label="Log out"
                        title="Log out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </header>
    )
}