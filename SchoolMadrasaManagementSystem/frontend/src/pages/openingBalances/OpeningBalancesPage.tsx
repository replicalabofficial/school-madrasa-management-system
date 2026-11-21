import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Info, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { openingBalancesApi } from '../../api/openingBalancesApi'
import { ledgerApi } from '../../api/ledgerApi'
import { branchesApi } from '../../api/branchesApi'
import type { ApiErrorPayload } from '../../api/client'
import type { Branch } from '../../types/branch'
import type { LedgerAccountOption } from '../../types/ledgerReport'
import type { OpeningBalance, OpeningEntryType } from '../../types/openingBalance'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
const money = (value: number) => currencyFormatter.format(value)

// Accounts that normally carry a Debit balance; everything else normally Credit
const DEBIT_NORMAL_TYPES = ['Cash', 'Fixed Assets', 'Accounts Receivable', 'Inventory']
// Opening balances are only for balance-sheet accounts
const NOT_ALLOWED_TYPES = ['Income', 'Expenses', 'Cost of Sales']
const EQUITY_ACCOUNT_CODE = '3900'

const selectClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

export function OpeningBalancesPage() {
    const queryClient = useQueryClient()

    const [filterBranchId, setFilterBranchId] = useState<number | ''>('')
    const [branchId, setBranchId] = useState<number | ''>('')
    const [accountId, setAccountId] = useState<number | ''>('')
    const [entryType, setEntryType] = useState<OpeningEntryType>('Debit')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(today())
    const [description, setDescription] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<OpeningBalance | null>(null)

    const branchesQuery = useQuery<Branch[], ApiErrorPayload>({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
    })

    const accountsQuery = useQuery<LedgerAccountOption[], ApiErrorPayload>({
        queryKey: ['ledger-accounts'],
        queryFn: ledgerApi.getAccounts,
    })

    const listQuery = useQuery<OpeningBalance[], ApiErrorPayload>({
        queryKey: ['opening-balances', filterBranchId],
        queryFn: () => openingBalancesApi.getAll(filterBranchId === '' ? undefined : filterBranchId),
    })

    const allowedAccounts = useMemo(
        () =>
            (accountsQuery.data ?? []).filter(
                (a) => !NOT_ALLOWED_TYPES.includes(a.accountType) && a.accountId !== EQUITY_ACCOUNT_CODE,
            ),
        [accountsQuery.data],
    )

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['opening-balances'] })
        queryClient.invalidateQueries({ queryKey: ['ledger-report'] })
        queryClient.invalidateQueries({ queryKey: ['ledger-accounts'] })
        queryClient.invalidateQueries({ queryKey: ['general-ledger'] })
    }

    const createMutation = useMutation({
        mutationFn: openingBalancesApi.create,
        onSuccess: () => {
            invalidateAll()
            setAccountId('')
            setAmount('')
            setDescription('')
            setFormError(null)
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to save opening balance.'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => openingBalancesApi.delete(id),
        onSuccess: () => {
            invalidateAll()
            setDeleteTarget(null)
        },
        onError: (err) => {
            alert((err as ApiErrorPayload).message ?? 'Failed to delete opening balance.')
            setDeleteTarget(null)
        },
    })

    function handleAccountChange(value: string) {
        const id = value ? Number(value) : ''
        setAccountId(id)
        const account = allowedAccounts.find((a) => a.id === id)
        if (account) {
            setEntryType(DEBIT_NORMAL_TYPES.includes(account.accountType) ? 'Debit' : 'Credit')
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        const value = Number(amount)
        if (branchId === '') return setFormError('Please select a branch.')
        if (accountId === '') return setFormError('Please select an account.')
        if (!amount || Number.isNaN(value) || value <= 0) return setFormError('Amount must be greater than zero.')
        if (!date) return setFormError('Please select a date.')

        createMutation.mutate({
            branchId,
            chartOfAccountId: accountId,
            entryType,
            amount: value,
            date,
            description: description.trim() || undefined,
        })
    }

    const rows = listQuery.data ?? []
    const totalDebit = rows.filter((r) => r.entryType === 'Debit').reduce((s, r) => s + r.amount, 0)
    const totalCredit = rows.filter((r) => r.entryType === 'Credit').reduce((s, r) => s + r.amount, 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Opening Balances</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Enter the balances that already existed before EFAS was started — once, at the start.
                </p>
            </div>

            <Card className="flex items-start gap-3 border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                    <p>
                        Examples: cash in hand and bank balance on the start date, old unpaid fees (Accounts Receivable),
                        furniture and computers (Fixed Assets), and any amount the institution owes (Liabilities).
                    </p>
                    <p>
                        The other side is posted automatically to <strong>Opening Balance Equity</strong>, so the Trial
                        Balance always stays equal. Income and Expense accounts are not used here.
                    </p>
                </div>
            </Card>

            <Card className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                            <select value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')} className={selectClass}>
                                <option value="">Select branch</option>
                                {(branchesQuery.data ?? []).map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Account</label>
                            <select value={accountId} onChange={(e) => handleAccountChange(e.target.value)} className={selectClass}>
                                <option value="">Select account</option>
                                {allowedAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.accountId} – {a.accountDescription} ({a.accountType})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                            <select value={entryType} onChange={(e) => setEntryType(e.target.value as OpeningEntryType)} className={selectClass}>
                                <option value="Debit">Debit — money / asset we have</option>
                                <option value="Credit">Credit — amount we owe</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount (PKR)</label>
                            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">As of date</label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Note (optional)</label>
                            <Input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Cash in hand on start date" />
                        </div>
                    </div>

                    <Button type="submit" disabled={createMutation.isPending}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        {createMutation.isPending ? 'Saving...' : 'Save Opening Balance'}
                    </Button>
                </form>
            </Card>

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-[220px]">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Show branch</label>
                    <select value={filterBranchId} onChange={(e) => setFilterBranchId(e.target.value ? Number(e.target.value) : '')} className={selectClass}>
                        <option value="">All branches</option>
                        {(branchesQuery.data ?? []).map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                {rows.length > 0 && (
                    <p className="text-sm text-slate-500">
                        Total debit <span className="font-semibold text-slate-800">{money(totalDebit)}</span> · Total credit{' '}
                        <span className="font-semibold text-slate-800">{money(totalCredit)}</span>
                    </p>
                )}
            </div>

            {listQuery.isLoading && (
                <div className="flex min-h-[20vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading opening balances...</span>
                </div>
            )}

            {listQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-700">{listQuery.error.message}</p>
                </Card>
            )}

            {listQuery.data && (
                <Card className="overflow-hidden">
                    {rows.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No opening balances entered yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Account</th>
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Debit</th>
                                        <th className="px-5 py-3 font-medium">Credit</th>
                                        <th className="px-5 py-3 font-medium">Note</th>
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{r.branchName}</td>
                                            <td className="px-5 py-3 text-slate-600">
                                                {r.accountId} – {r.accountDescription}
                                                <span className="block text-xs text-slate-400">{r.accountType}</span>
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{new Date(r.date).toLocaleDateString()}</td>
                                            <td className="px-5 py-3 text-slate-900">{r.entryType === 'Debit' ? money(r.amount) : '—'}</td>
                                            <td className="px-5 py-3 text-slate-900">{r.entryType === 'Credit' ? money(r.amount) : '—'}</td>
                                            <td className="px-5 py-3 text-slate-500">{r.description || '—'}</td>
                                            <td className="px-5 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(r)}
                                                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                    aria-label="Delete opening balance"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete Opening Balance"
                description={`Delete the opening balance of ${deleteTarget ? money(deleteTarget.amount) : ''} for "${deleteTarget?.accountDescription}" (${deleteTarget?.branchName})? You can enter it again afterwards.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    )
}