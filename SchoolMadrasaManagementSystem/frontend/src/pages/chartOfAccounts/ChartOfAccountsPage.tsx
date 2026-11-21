import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, BookOpen, Loader2, Pencil, Plus, Power, PowerOff, Search, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { chartOfAccountsApi } from '../../api/chartOfAccountsApi'
import { branchesApi } from '../../api/branchesApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import { ACCOUNT_TYPES, type ChartOfAccount, type ChartOfAccountPayload } from '../../types/chartOfAccount'
import { ledgerApi } from '../../api/ledgerApi'
import type { LedgerEntry } from '../../types/ledger'

interface FormValues {
    accountId: string
    accountDescription: string
    accountType: string
    isActive: boolean
    branchId: number | ''
}

const emptyForm: FormValues = {
    accountId: '',
    accountDescription: '',
    accountType: ACCOUNT_TYPES[0],
    isActive: true,
    branchId: '',
}

export function ChartOfAccountsPage() {
    const queryClient = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [search, setSearch] = useState('')
    const [branchFilter, setBranchFilter] = useState<number | ''>('')
    const [formOpen, setFormOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null)
    const [formValues, setFormValues] = useState<FormValues>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [statusTarget, setStatusTarget] = useState<ChartOfAccount | null>(null)
    const [ledgerAccount, setLedgerAccount] = useState<ChartOfAccount | null>(null)
    const [ledgerDateFrom, setLedgerDateFrom] = useState('')
    const [ledgerDateTo, setLedgerDateTo] = useState('')

    const ledgerQuery = useQuery<LedgerEntry[]>({
        queryKey: ['ledger', ledgerAccount?.id, ledgerDateFrom, ledgerDateTo],
        queryFn: () => ledgerApi.get(ledgerAccount!.id, ledgerDateFrom || undefined, ledgerDateTo || undefined),
        enabled: ledgerAccount !== null,
    })

    const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

    const accountsQuery = useQuery<ChartOfAccount[], ApiErrorPayload>({
        queryKey: ['chart-of-accounts'],
        queryFn: chartOfAccountsApi.getAll,
    })

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: isHeadOffice,
    })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    const createMutation = useMutation({
        mutationFn: chartOfAccountsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to create account.'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: ChartOfAccountPayload }) =>
            chartOfAccountsApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to update account.'),
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
            chartOfAccountsApi.setActiveStatus(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            setStatusTarget(null)
        },
    })

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    function openCreateForm() {
        setEditingAccount(null)
        setFormValues(emptyForm)
        setFormError(null)
        setFormOpen(true)
    }

    function openEditForm(account: ChartOfAccount) {
        setEditingAccount(account)
        setFormValues({
            accountId: account.accountId,
            accountDescription: account.accountDescription,
            accountType: account.accountType,
            isActive: account.isActive,
            branchId: account.branchId ?? '',
        })
        setFormError(null)
        setFormOpen(true)
    }

    function closeForm() {
        setFormOpen(false)
        setEditingAccount(null)
        setFormError(null)
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        if (!formValues.accountId.trim() || !formValues.accountDescription.trim()) {
            setFormError('Account ID and description are required.')
            return
        }

        const payload: ChartOfAccountPayload = {
            accountId: formValues.accountId.trim(),
            accountDescription: formValues.accountDescription.trim(),
            accountType: formValues.accountType,
            isActive: formValues.isActive,
            branchId: formValues.branchId ? Number(formValues.branchId) : null,
        }

        if (editingAccount) {
            updateMutation.mutate({ id: editingAccount.id, payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    const filtered = useMemo(() => {
        if (!accountsQuery.data) return []
        let rows = accountsQuery.data

        if (branchFilter) {
            rows = rows.filter((a) => a.branchId === branchFilter)
        }

        const term = search.trim().toLowerCase()
        if (term) {
            rows = rows.filter(
                (a) => a.accountId.toLowerCase().includes(term) || a.accountDescription.toLowerCase().includes(term),
            )
        }

        return rows
    }, [accountsQuery.data, search, branchFilter])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chart of Accounts</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage the accounting structure used across the system.</p>
                </div>
                {isHeadOffice && (
                    <Button onClick={openCreateForm}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add Account
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Account ID or description..." className="pl-10" />
                </div>

                {isHeadOffice && (
                    <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : '')}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                        <option value="">All branches</option>
                        {activeBranches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {accountsQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading accounts...</span>
                </div>
            )}

            {accountsQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load accounts</p>
                        <p className="mt-1 text-sm text-red-600">{accountsQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {accountsQuery.data && (
                <Card className="overflow-hidden">
                    {filtered.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No accounts match.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Account ID</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        <th className="px-5 py-3 font-medium">Type</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Branch</th>}
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((account) => (
                                        <tr key={account.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{account.accountId}</td>
                                            <td className="px-5 py-3 text-slate-600">{account.accountDescription}</td>
                                            <td className="px-5 py-3 text-slate-600">{account.accountType}</td>
                                            {isHeadOffice && <td className="px-5 py-3 text-slate-600">{account.branch?.name ?? 'Shared'}</td>}
                                            <td className="px-5 py-3">
                                                <span className={account.isActive ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700' : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500'}>
                                                    {account.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {isHeadOffice ? (
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => openEditForm(account)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit account" title="Edit">
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setStatusTarget(account)}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                            aria-label={account.isActive ? 'Deactivate account' : 'Activate account'}
                                                            title={account.isActive ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {account.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setLedgerAccount(account)}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                            aria-label="View ledger"
                                                            title="View Ledger"
                                                        >
                                                            <BookOpen className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            ) : null}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {formOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">
                                {editingAccount ? 'Edit Account' : 'Add Account'}
                            </h2>
                            <button type="button" onClick={closeForm} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Account ID</label>
                                <Input value={formValues.accountId} onChange={(e) => setFormValues((v) => ({ ...v, accountId: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                                <Input value={formValues.accountDescription} onChange={(e) => setFormValues((v) => ({ ...v, accountDescription: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                                <select
                                    value={formValues.accountType}
                                    onChange={(e) => setFormValues((v) => ({ ...v, accountType: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                >
                                    {ACCOUNT_TYPES.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                                <select
                                    value={formValues.branchId}
                                    onChange={(e) => setFormValues((v) => ({ ...v, branchId: e.target.value ? Number(e.target.value) : '' }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                >
                                    <option value="">Shared (visible to all branches)</option>
                                    {activeBranches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name} only</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-slate-400">
                                    Choose a branch to restrict this account to only that branch. Leave as Shared for accounts like Cash/Bank that every branch should see.
                                </p>
                            </div>

                            {editingAccount && (
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" checked={formValues.isActive} onChange={(e) => setFormValues((v) => ({ ...v, isActive: e.target.checked }))} />
                                    Active
                                </label>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeForm} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : editingAccount ? 'Save Changes' : 'Create Account'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={statusTarget !== null}
                title={statusTarget?.isActive ? 'Deactivate Account' : 'Activate Account'}
                description={`Are you sure you want to ${statusTarget?.isActive ? 'deactivate' : 'activate'} "${statusTarget?.accountDescription}"?`}
                confirmLabel={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
                variant={statusTarget?.isActive ? 'danger' : 'primary'}
                loading={statusMutation.isPending}
                onCancel={() => setStatusTarget(null)}
                onConfirm={() => {
                    if (statusTarget) {
                        statusMutation.mutate({ id: statusTarget.id, isActive: !statusTarget.isActive })
                    }
                }}
            />
            {ledgerAccount && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">
                                Ledger — {ledgerAccount.accountDescription}
                            </h2>
                            <button type="button" onClick={() => setLedgerAccount(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 px-5 py-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                                <Input type="date" value={ledgerDateFrom} onChange={(e) => setLedgerDateFrom(e.target.value)} className="w-40" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                                <Input type="date" value={ledgerDateTo} onChange={(e) => setLedgerDateTo(e.target.value)} className="w-40" />
                            </div>
                        </div>

                        <div className="p-5">
                            {ledgerQuery.isLoading && (
                                <div className="flex items-center justify-center py-8 text-slate-400">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="ml-2 text-sm">Loading ledger...</span>
                                </div>
                            )}

                            {ledgerQuery.data && ledgerQuery.data.length === 0 && (
                                <p className="text-sm text-slate-400">No transactions found.</p>
                            )}

                            {ledgerQuery.data && ledgerQuery.data.length > 0 && (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="py-2 pr-3 font-medium">Date</th>
                                            <th className="py-2 pr-3 font-medium">Description</th>
                                            <th className="py-2 pr-3 font-medium">Debit</th>
                                            <th className="py-2 pr-3 font-medium">Credit</th>
                                            <th className="py-2 font-medium">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerQuery.data.map((entry, index) => (
                                            <tr key={index} className="border-b border-slate-100">
                                                <td className="py-2 pr-3 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                                                <td className="py-2 pr-3 text-slate-600">{entry.description}</td>
                                                <td className="py-2 pr-3 text-slate-600">{entry.debit > 0 ? currencyFormatter.format(entry.debit) : '—'}</td>
                                                <td className="py-2 pr-3 text-slate-600">{entry.credit > 0 ? currencyFormatter.format(entry.credit) : '—'}</td>
                                                <td className="py-2 font-medium text-slate-900">{currencyFormatter.format(entry.runningBalance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}