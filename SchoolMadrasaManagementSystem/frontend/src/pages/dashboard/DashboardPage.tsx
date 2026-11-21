import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { dashboardApi } from '../../api/dashboardApi'
import { branchesApi } from '../../api/branchesApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { BranchDashboard, DashboardFilter, HeadOfficeDashboard } from '../../types/dashboard'
import type { Branch } from '../../types/branch'

const currencyFormatter = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
})

const money = (value: number) => currencyFormatter.format(value)

export function DashboardPage() {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    // Filters (branch filter is Head Office only)
    const [branchId, setBranchId] = useState<number | ''>('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const filter: DashboardFilter = {
        branchId: isHeadOffice && branchId !== '' ? branchId : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
    }

    const branchesQuery = useQuery<Branch[], ApiErrorPayload>({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: isHeadOffice,
    })

    const headOfficeQuery = useQuery<HeadOfficeDashboard, ApiErrorPayload>({
        queryKey: ['dashboard', 'head-office', filter.branchId ?? 'all', filter.dateFrom ?? '', filter.dateTo ?? ''],
        queryFn: () => dashboardApi.getHeadOffice(filter),
        enabled: isHeadOffice,
        placeholderData: (previous) => previous,
    })

    const branchQuery = useQuery<BranchDashboard, ApiErrorPayload>({
        queryKey: ['dashboard', 'branch', user?.branchId, filter.dateFrom ?? '', filter.dateTo ?? ''],
        queryFn: () => dashboardApi.getBranch(user!.branchId!, filter),
        enabled: !isHeadOffice && user?.branchId != null,
        placeholderData: (previous) => previous,
    })

    if (!isHeadOffice && user?.branchId == null) {
        return (
            <Card className="p-6">
                <p className="text-sm text-slate-500">
                    No branch is assigned to this account, so no dashboard data is available.
                </p>
            </Card>
        )
    }

    const activeQuery = isHeadOffice ? headOfficeQuery : branchQuery
    const selectedBranch = (branchesQuery.data ?? []).find((b) => b.id === branchId)
    const hasFilters = branchId !== '' || dateFrom !== '' || dateTo !== ''

    function resetFilters() {
        setBranchId('')
        setDateFrom('')
        setDateTo('')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {isHeadOffice
                            ? selectedBranch
                                ? `Showing ${selectedBranch.name} only.`
                                : 'Overview of all branches.'
                            : 'Overview of your branch.'}
                    </p>
                </div>
                {activeQuery.isFetching && !activeQuery.isLoading && (
                    <Loader2 className="mt-2 h-5 w-5 animate-spin text-slate-400" />
                )}
            </div>

            <Card className="flex flex-wrap items-end gap-4 p-4">
                {isHeadOffice && (
                    <div className="min-w-[220px] flex-1 sm:flex-none">
                        <label className="mb-1 block text-xs font-medium text-slate-500">Branch</label>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                            <option value="">All branches</option>
                            {(branchesQuery.data ?? []).map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                    {b.isActive ? '' : ' (inactive)'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                </div>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </button>
                )}
            </Card>

            {activeQuery.isLoading && (
                <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading dashboard...</span>
                </div>
            )}

            {activeQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load dashboard data</p>
                        <p className="mt-1 text-sm text-red-600">{activeQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {isHeadOffice && headOfficeQuery.data && (
                <HeadOfficeDashboardView
                    data={headOfficeQuery.data}
                    selectedBranchId={branchId === '' ? null : branchId}
                />
            )}

            {!isHeadOffice && branchQuery.data && <BranchDashboardView data={branchQuery.data} />}
        </div>
    )
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'positive' | 'negative' }) {
    const valueColor = tone === 'negative' ? 'text-red-600' : tone === 'positive' ? 'text-emerald-700' : 'text-slate-900'
    return (
        <Card className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${valueColor}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </Card>
    )
}

function CategoryList({ title, items, empty }: { title: string; items: { category: string; amount: number }[]; empty: string }) {
    return (
        <Card className="p-6">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <div className="mt-4 space-y-2">
                {items.length === 0 ? (
                    <p className="text-sm text-slate-400">{empty}</p>
                ) : (
                    items.map((item) => (
                        <div key={item.category} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{item.category}</span>
                            <span className="font-medium text-slate-900">{money(item.amount)}</span>
                        </div>
                    ))
                )}
            </div>
        </Card>
    )
}

function HeadOfficeDashboardView({ data, selectedBranchId }: { data: HeadOfficeDashboard; selectedBranchId: number | null }) {
    const branchRows = selectedBranchId == null
        ? data.branchFinancialOverview
        : data.branchFinancialOverview.filter((b) => b.branchId === selectedBranchId)

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {selectedBranchId == null && <SummaryCard label="Branches" value={String(data.totalBranches)} />}
                <SummaryCard label="Students" value={String(data.totalStudents)} />
                <SummaryCard label="Staff" value={String(data.totalStaff)} />
                <SummaryCard
                    label="Net Balance"
                    value={money(data.netBalance)}
                    hint="Total income − total expenses"
                    tone={data.netBalance < 0 ? 'negative' : data.netBalance > 0 ? 'positive' : undefined}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Total Income"
                    value={money(data.totalIncome)}
                    hint={`Fees collected ${money(data.feesCollected)} · Other ${money(data.otherIncome)}`}
                />
                <SummaryCard
                    label="Total Expenses"
                    value={money(data.totalExpenses)}
                    hint={`Expenses ${money(data.operatingExpenses)} · Salaries paid ${money(data.salariesPaid)}`}
                />
                <SummaryCard label="Outstanding Fees" value={money(data.outstandingFees)} hint="Fees not yet paid" />
                <SummaryCard label="Unpaid Salaries" value={money(data.unpaidSalaries)} hint="Salary still to be paid" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <CategoryList title="Income by Category" items={data.incomeOverview} empty="No income recorded yet." />
                <CategoryList title="Expenses by Category" items={data.expenseOverview} empty="No expenses recorded yet." />
            </div>

            <Card className="p-6">
                <h2 className="font-semibold text-slate-900">Branch Financial Overview</h2>

                {branchRows.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No branches found.</p>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="pb-2 pr-4 font-medium">Branch</th>
                                    <th className="pb-2 pr-4 font-medium">Fees Collected</th>
                                    <th className="pb-2 pr-4 font-medium">Other Income</th>
                                    <th className="pb-2 pr-4 font-medium">Expenses</th>
                                    <th className="pb-2 pr-4 font-medium">Salaries Paid</th>
                                    <th className="pb-2 font-medium">Net Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchRows.map((branch) => (
                                    <tr key={branch.branchId} className="border-b border-slate-100">
                                        <td className="py-2 pr-4 font-medium text-slate-800">{branch.branchName}</td>
                                        <td className="py-2 pr-4 text-slate-600">{money(branch.fees)}</td>
                                        <td className="py-2 pr-4 text-slate-600">{money(branch.income)}</td>
                                        <td className="py-2 pr-4 text-slate-600">{money(branch.expenses)}</td>
                                        <td className="py-2 pr-4 text-slate-600">{money(branch.salaries)}</td>
                                        <td className={`py-2 font-medium ${branch.netBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                            {money(branch.netBalance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card className="p-6">
                <h2 className="font-semibold text-slate-900">Recent Expenses</h2>

                {data.recentExpenses.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No recent expenses.</p>
                ) : (
                    <div className="mt-4 divide-y divide-slate-100">
                        {data.recentExpenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between py-3 text-sm">
                                <div>
                                    <p className="font-medium text-slate-800">{expense.description}</p>
                                    <p className="text-slate-500">
                                        {expense.branchName} · {expense.category} · {new Date(expense.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className="font-medium text-slate-900">{money(expense.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}

function BranchDashboardView({ data }: { data: BranchDashboard }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Students" value={String(data.totalStudents)} />
                <SummaryCard label="Staff" value={String(data.totalStaff)} />
                <SummaryCard label="Fees Billed" value={money(data.totalFees)} hint={`Collected ${money(data.feesCollected)}`} />
                <SummaryCard
                    label="Net Balance"
                    value={money(data.netBalance)}
                    hint="Total income − total expenses"
                    tone={data.netBalance < 0 ? 'negative' : data.netBalance > 0 ? 'positive' : undefined}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Total Income"
                    value={money(data.totalIncome)}
                    hint={`Fees collected ${money(data.feesCollected)} · Other ${money(data.otherIncome)}`}
                />
                <SummaryCard
                    label="Total Expenses"
                    value={money(data.totalExpenses)}
                    hint={`Expenses ${money(data.operatingExpenses)} · Salaries paid ${money(data.salariesPaid)}`}
                />
                <SummaryCard label="Outstanding Fees" value={money(data.outstandingFees)} hint="Fees not yet paid" />
                <SummaryCard label="Unpaid Salaries" value={money(data.unpaidSalaries)} hint="Salary still to be paid" />
            </div>

            <Card className="p-6">
                <h2 className="font-semibold text-slate-900">{data.branchName}</h2>
                <p className="mt-2 text-sm text-slate-500">Branch-level overview for your assigned branch.</p>
            </Card>
        </div>
    )
}