import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { SearchableSelect } from '../../components/common/SearchableSelect'
import { expensesApi } from '../../api/expensesApi'
import { chartOfAccountsApi } from '../../api/chartOfAccountsApi'
import { branchesApi } from '../../api/branchesApi'
import { vouchersApi } from '../../api/vouchersApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { FinancialEntry, FinancialEntryPayload } from '../../types/incomeExpense'

// Today in the user's own time zone (toISOString gives the UTC date)
function todayLocal() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

interface FormValues {
    date: string
    chartOfAccountId: number | ''
    amount: string
    description: string
    branchId: number | ''
    notes: string
    sourceAccountId: number | ''
}

export function ExpensesPage() {
    const queryClient = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [formOpen, setFormOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null)
    const [formValues, setFormValues] = useState<FormValues>({
        date: todayLocal(),
        chartOfAccountId: '',
        amount: '',
        description: '',
        branchId: '',
        notes: '',
        sourceAccountId: '',
    })
    const [formError, setFormError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<FinancialEntry | null>(null)
    // Errors from actions in the list (delete, voucher), e.g. "books are locked"
    const [pageError, setPageError] = useState<string | null>(null)

    const entriesQuery = useQuery<FinancialEntry[], ApiErrorPayload>({
        queryKey: ['expenses'],
        queryFn: expensesApi.getAll,
    })

    const accountsQuery = useQuery({
        queryKey: ['chart-of-accounts'],
        queryFn: chartOfAccountsApi.getAll,
        enabled: formOpen,
    })

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: isHeadOffice && formOpen,
    })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    const effectiveBranchId = isHeadOffice ? formValues.branchId : user?.branchId

    const expenseAccounts = useMemo(
        () =>
            (accountsQuery.data ?? []).filter(
                (a) =>
                    a.isActive &&
                    a.accountType === 'Expenses' &&
                    (a.branchId === null || a.branchId === effectiveBranchId),
            ),
        [accountsQuery.data, effectiveBranchId],
    )

    const cashAccounts = useMemo(
        () =>
            (accountsQuery.data ?? []).filter(
                (a) =>
                    a.isActive &&
                    a.accountType === 'Cash' &&
                    (a.branchId === null || a.branchId === effectiveBranchId),
            ),
        [accountsQuery.data, effectiveBranchId],
    )

    const createMutation = useMutation({
        mutationFn: expensesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to create expense entry.'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: FinancialEntryPayload }) => expensesApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to update expense entry.'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => expensesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            setDeleteTarget(null)
        },
        onError: (err) => {
            setDeleteTarget(null)
            setPageError((err as ApiErrorPayload).message ?? 'Failed to delete expense entry.')
        },
    })

    const voucherMutation = useMutation({
        mutationFn: vouchersApi.generateFromExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vouchers'] })
            alert('Voucher generated. Check the Vouchers page.')
        },
        onError: (err) => setPageError((err as ApiErrorPayload).message ?? 'Failed to generate voucher.'),
    })

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    function openCreateForm() {
        setEditingEntry(null)
        setFormValues({
            date: todayLocal(),
            chartOfAccountId: '',
            amount: '',
            description: '',
            branchId: isHeadOffice ? '' : (user?.branchId ?? ''),
            notes: '',
            sourceAccountId: '',
        })
        setFormError(null)
        setFormOpen(true)
    }

    function openEditForm(entry: FinancialEntry) {
        setEditingEntry(entry)
        setFormValues({
            date: entry.date.slice(0, 10),
            chartOfAccountId: entry.chartOfAccountId,
            amount: String(entry.amount),
            description: entry.description,
            branchId: entry.branchId,
            notes: entry.notes ?? '',
            sourceAccountId: entry.sourceAccountId ?? '',
        })
        setFormError(null)
        setFormOpen(true)
    }

    function closeForm() {
        setFormOpen(false)
        setEditingEntry(null)
        setFormError(null)
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        const branchId = isHeadOffice ? formValues.branchId : user?.branchId

        if (!formValues.chartOfAccountId || !formValues.amount || !formValues.description.trim() || !branchId || !formValues.sourceAccountId) {
            setFormError('Please fill in all required fields, including the Cash/Bank account.')
            return
        }

        const payload: FinancialEntryPayload = {
            date: formValues.date,
            chartOfAccountId: Number(formValues.chartOfAccountId),
            amount: Number(formValues.amount),
            description: formValues.description.trim(),
            branchId: Number(branchId),
            notes: formValues.notes.trim() || null,
            sourceAccountId: Number(formValues.sourceAccountId),
        }

        if (editingEntry) {
            updateMutation.mutate({ id: editingEntry.id, payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expenses</h1>
                    <p className="mt-1 text-sm text-slate-500">Track expense entries against your chart of accounts.</p>
                </div>
                <Button onClick={openCreateForm}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Expense
                </Button>
            </div>

            {pageError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="flex-1">{pageError}</span>
                    <button type="button" onClick={() => setPageError(null)} className="rounded p-0.5 text-red-500 hover:bg-red-100" aria-label="Dismiss">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {entriesQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading expenses...</span>
                </div>
            )}

            {entriesQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load expenses</p>
                        <p className="mt-1 text-sm text-red-600">{entriesQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {entriesQuery.data && (
                <Card className="overflow-hidden">
                    {entriesQuery.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No expense entries found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Account</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Branch</th>}
                                        <th className="px-5 py-3 font-medium">Amount</th>
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entriesQuery.data.map((entry) => (
                                        <tr key={entry.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                                            <td className="px-5 py-3 text-slate-600">{entry.chartOfAccount?.accountDescription ?? '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{entry.description}</td>
                                            {isHeadOffice && <td className="px-5 py-3 text-slate-600">{entry.branch?.name ?? '—'}</td>}
                                            <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(entry.amount)}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => openEditForm(entry)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit entry" title="Edit">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPageError(null)
                                                            voucherMutation.mutate(entry.id)
                                                        }}
                                                        disabled={voucherMutation.isPending}
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                        aria-label="Generate voucher"
                                                        title="Generate Voucher"
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => {
                                                        setPageError(null)
                                                        setDeleteTarget(entry)
                                                    }} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete" title="Delete">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
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
                                {editingEntry ? 'Edit Expense' : 'Add Expense'}
                            </h2>
                            <button type="button" onClick={closeForm} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                                <Input type="date" value={formValues.date} onChange={(e) => setFormValues((v) => ({ ...v, date: e.target.value }))} required />
                            </div>

                            {isHeadOffice && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                                    <select
                                        value={formValues.branchId}
                                        onChange={(e) => setFormValues((v) => ({ ...v, branchId: e.target.value ? Number(e.target.value) : '', chartOfAccountId: '', sourceAccountId: '' }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                        required
                                    >
                                        <option value="">Select a branch</option>
                                        {activeBranches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Account</label>
                                <SearchableSelect
                                    options={expenseAccounts.map((a) => ({ value: a.id, label: `${a.accountId} — ${a.accountDescription}` }))}
                                    value={formValues.chartOfAccountId}
                                    onChange={(v) => setFormValues((p) => ({ ...p, chartOfAccountId: v }))}
                                    placeholder="Search expense account..."
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
                                <Input type="number" min="0" step="0.01" value={formValues.amount} onChange={(e) => setFormValues((v) => ({ ...v, amount: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                                <Input value={formValues.description} onChange={(e) => setFormValues((v) => ({ ...v, description: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Cash / Bank Account</label>
                                <SearchableSelect
                                    options={cashAccounts.map((a) => ({ value: a.id, label: `${a.accountId} — ${a.accountDescription}` }))}
                                    value={formValues.sourceAccountId}
                                    onChange={(v) => setFormValues((p) => ({ ...p, sourceAccountId: v }))}
                                    placeholder="Search Cash/Bank account..."
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes (optional)</label>
                                <Input value={formValues.notes} onChange={(e) => setFormValues((v) => ({ ...v, notes: e.target.value }))} />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeForm} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : editingEntry ? 'Save Changes' : 'Create Expense'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete Expense Entry"
                description="Are you sure you want to delete this expense entry? This cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    )
}