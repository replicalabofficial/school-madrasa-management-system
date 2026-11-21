import {
    BookOpen,
    Building2,
    Calculator,
    ChevronLeft,
    CircleDollarSign,
    FileBarChart,
    LayoutDashboard,
    Logs,
    Receipt,
    Scale,
    ScrollText,
    Search,
    Settings,
    Users,
    Wallet,
    X,
    AlertTriangle,
    CheckSquare,
    CheckCircle2,
    PieChart,
    TrendingUp,
    Link2,
    Landmark,
    NotebookPen,
    CalendarCheck,
    CalendarPlus,
    SlidersHorizontal,
    ClipboardList,
    UserX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '../utils/classNames'
import { useAuthStore } from '../stores/authStore'
import { canAccessPath } from '../navigation/access'
import { brandingApi } from '../api/brandingApi'
import { API_ORIGIN } from '../api/client'

interface SidebarProps {
    open: boolean
    collapsed: boolean
    onClose: () => void
    onToggle: () => void
}

const navigation = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Branches', path: '/branches', icon: Building2 },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Staff', path: '/staff', icon: Users },
    { label: 'Fees', path: '/fees', icon: CircleDollarSign },
    { label: 'Monthly Fee Posting', path: '/fee-posting', icon: CalendarPlus },
    { label: 'Fee Setup', path: '/fee-setup', icon: SlidersHorizontal },
    { label: 'Class Fee Summary', path: '/class-fee-summary', icon: ClipboardList },
    { label: 'Left Students Dues', path: '/left-students-dues', icon: UserX },
    { label: 'Income', path: '/income', icon: Wallet },
    { label: 'Expenses', path: '/expenses', icon: Wallet },
    { label: 'Chart of Accounts', path: '/chart-of-accounts', icon: BookOpen },
    { label: 'Opening Balances', path: '/opening-balances', icon: Landmark },
    { label: 'Journal Vouchers', path: '/journal-vouchers', icon: NotebookPen },
    { label: 'Period Closing', path: '/period-closing', icon: CalendarCheck },
    { label: 'Salaries', path: '/salaries', icon: Wallet },
    { label: 'Trial Balance', path: '/trial-balance', icon: Calculator },
    { label: 'Balance Sheet', path: '/balance-sheet', icon: Scale },
    { label: 'Reports', path: '/reports', icon: FileBarChart },
    { label: 'General Ledger', path: '/general-ledger', icon: ScrollText },
    { label: 'Aged Receivables', path: '/aged-receivables', icon: AlertTriangle },
    { label: 'Bank Reconciliation', path: '/bank-reconciliation', icon: CheckSquare },
    { label: 'Vouchers', path: '/vouchers', icon: Receipt },
    { label: 'Activity Logs', path: '/activity-logs', icon: Logs },
    { label: 'Users & Permissions', path: '/users', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Discount Approvals', path: '/discount-approvals', icon: CheckCircle2 },
    { label: 'Income & Expense Summary', path: '/income-expense-summary', icon: PieChart },
    { label: 'Income Statement', path: '/income-statement', icon: TrendingUp },
    { label: 'Fee Category Accounts', path: '/fee-category-accounts', icon: Link2 },
]

// Extra words people may type for a module (English + Roman Urdu)
const searchKeywords: Record<string, string> = {
    '/': 'home overview summary',
    '/students': 'gr admission import promotion talba',
    '/staff': 'employee teacher',
    '/fees': 'fee receipt invoice collection challan',
    '/fee-posting': 'monthly posting generate dues mahana fees',
    '/fee-setup': 'fee structure class fee session august',
    '/class-fee-summary': 'class wise report discount net received strength',
    '/left-students-dues': 'left chhor gaye dues baqaya recovery siblings family',
    '/salaries': 'salary payroll tankhwa advance',
    '/expenses': 'kharcha bill',
    '/period-closing': 'lock year end close',
    '/general-ledger': 'ledger',
    '/aged-receivables': 'defaulters outstanding aging',
    '/discount-approvals': 'concession discount approve',
    '/users': 'permissions login account',
    '/settings': 'logo institution profile',
    '/income-statement': 'profit loss p&l',
}

export function Sidebar({
    open,
    collapsed,
    onClose,
    onToggle,
}: SidebarProps) {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    const role = useAuthStore((state) => state.user?.role)
    const enabledModules = useAuthStore((state) => state.user?.enabledModules)
    const visibleNavigation = navigation.filter((item) =>
        canAccessPath(item.path, role, enabledModules),
    )

    const q = query.trim().toLowerCase()
    const filteredNavigation = q
        ? visibleNavigation.filter((item) =>
            `${item.label} ${searchKeywords[item.path] ?? ''}`.toLowerCase().includes(q),
        )
        : visibleNavigation

    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.get,
    })

    const focusSearch = () => {
        if (collapsed) onToggle()
        setTimeout(() => searchRef.current?.focus(), 50)
    }

    // Ctrl + K (or Cmd + K) focuses the search box from anywhere
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                focusSearch()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsed])

    const goTo = (path: string) => {
        navigate(path)
        setQuery('')
        onClose()
    }

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white',
                    'transition-all duration-200 lg:translate-x-0',
                    collapsed ? 'w-20' : 'w-64',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
                    {!collapsed && (
                        <div className="flex min-w-0 items-center gap-2">
                            {brandingQuery.data?.logoPath && (
                                <img
                                    src={`${API_ORIGIN}${brandingQuery.data.logoPath}`}
                                    alt="Logo"
                                    className="h-9 w-9 shrink-0 rounded-lg object-contain"
                                />
                            )}
                            <div className="min-w-0">
                                <div className="truncate text-lg font-bold text-emerald-800">
                                    {brandingQuery.data?.institutionName ?? 'School & Madrasa'}
                                </div>
                                <div className="text-xs text-slate-500">Management System</div>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onToggle}
                        className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block"
                        aria-label="Toggle sidebar"
                    >
                        <ChevronLeft
                            className={cn(
                                'h-5 w-5 transition-transform',
                                collapsed && 'rotate-180',
                            )}
                        />
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                        aria-label="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Module search */}
                <div className="border-b border-slate-200 p-3">
                    {collapsed ? (
                        <button
                            type="button"
                            onClick={focusSearch}
                            className="flex w-full justify-center rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
                            title="Search modules (Ctrl + K)"
                            aria-label="Search modules"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-emerald-500 focus-within:bg-white">
                            <Search className="h-4 w-4 shrink-0 text-slate-400" />
                            <input
                                ref={searchRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setQuery('')
                                    if (e.key === 'Enter' && filteredNavigation[0]) {
                                        goTo(filteredNavigation[0].path)
                                    }
                                }}
                                placeholder="Search modules..."
                                aria-label="Search modules"
                                className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                            />
                            {query ? (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="text-slate-400 hover:text-slate-600"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            ) : (
                                <kbd className="hidden shrink-0 rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-400 lg:block">
                                    Ctrl K
                                </kbd>
                            )}
                        </div>
                    )}
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {filteredNavigation.map((item) => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                onClick={() => {
                                    setQuery('')
                                    onClose()
                                }}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                                        'transition-colors',
                                        isActive
                                            ? 'bg-emerald-50 text-emerald-800'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                        collapsed && 'justify-center',
                                    )
                                }
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        )
                    })}

                    {!collapsed && q && filteredNavigation.length === 0 && (
                        <p className="px-3 py-6 text-center text-sm text-slate-400">
                            No module found
                        </p>
                    )}
                </nav>
            </aside>
        </>
    )
}