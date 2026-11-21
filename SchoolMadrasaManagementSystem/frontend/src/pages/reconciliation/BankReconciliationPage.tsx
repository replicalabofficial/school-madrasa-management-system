import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { reconciliationApi } from '../../api/reconciliationApi'
import { chartOfAccountsApi } from '../../api/chartOfAccountsApi'
import type { ApiErrorPayload } from '../../api/client'
import type { LedgerEntry } from '../../types/ledger'


const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

export function BankReconciliationPage() {
    const queryClient = useQueryClient()

    const [accountId, setAccountId] = useState<number | ''>('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [statementBalance, setStatementBalance] = useState('')

    const accountsQuery = useQuery({
        queryKey: ['chart-of-accounts'],
        queryFn: chartOfAccountsApi.getAll,
    })
    const cashAccounts = (accountsQuery.data ?? []).filter((a) => a.isActive && a.accountType === 'Cash')

    const entriesQuery = useQuery<LedgerEntry[], ApiErrorPayload>({
        queryKey: ['reconciliation', accountId, dateFrom, dateTo],
        queryFn: () => reconciliationApi.getEntries(Number(accountId), dateFrom || undefined, dateTo || undefined),
        enabled: accountId !== '',
    })

    const toggleMutation = useMutation({
        mutationFn: ({ sourceType, sourceId, isReconciled }: { sourceType: string; sourceId: number; isReconciled: boolean }) =>
            reconciliationApi.toggle(sourceType, sourceId, isReconciled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliation', accountId, dateFrom, dateTo] })
        },
    })

    const reconcilableEntries = (entriesQuery.data ?? []).filter((e) => e.debit > 0 || e.credit > 0)

    const systemBalance = useMemo(() => {
        if (reconcilableEntries.length === 0) return 0
        return reconcilableEntries[reconcilableEntries.length - 1].runningBalance
    }, [reconcilableEntries])

    const reconciledBalance = useMemo(() => {
        let balance = 0
        for (const entry of reconcilableEntries) {
            if (entry.isReconciled) {
                balance += entry.debit - entry.credit
            }
        }
        return balance
    }, [reconcilableEntries])

    const statementBalanceNum = statementBalance ? Number(statementBalance) : null
    const difference = statementBalanceNum !== null ? statementBalanceNum - reconciledBalance : null

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bank Reconciliation</h1>
                <p className="mt-1 text-sm text-slate-500">Match your Cash/Bank account against your bank statement.</p>
            </div>

            <Card className="flex flex-wrap items-end gap-4 p-4">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Account</label>
                    <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
                        className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                        <option value="">Select account</option>
                        {cashAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.accountDescription}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Bank Statement Balance</label>
                    <Input type="number" step="0.01" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} className="w-40" placeholder="Optional" />
                </div>
            </Card>

            {accountId !== '' && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="p-5">
                        <p className="text-sm text-slate-500">System Balance</p>
                        <p className="mt-2 text-xl font-bold text-slate-900">{currencyFormatter.format(systemBalance)}</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-sm text-slate-500">Reconciled Balance</p>
                        <p className="mt-2 text-xl font-bold text-slate-900">{currencyFormatter.format(reconciledBalance)}</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-sm text-slate-500">Difference from Statement</p>
                        <p className={`mt-2 text-xl font-bold ${difference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {difference !== null ? currencyFormatter.format(difference) : '—'}
                        </p>
                    </Card>
                </div>
            )}

            {entriesQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading transactions...</span>
                </div>
            )}

            {entriesQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load transactions</p>
                        <p className="mt-1 text-sm text-red-600">{entriesQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {accountId !== '' && entriesQuery.data && (
                <Card className="overflow-hidden">
                    {reconcilableEntries.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No transactions found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        <th className="px-5 py-3 font-medium">Debit</th>
                                        <th className="px-5 py-3 font-medium">Credit</th>
                                        <th className="px-5 py-3 font-medium">Reconciled</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reconcilableEntries.map((entry, index) => (
                                        <tr key={`${entry.sourceType}-${entry.sourceId}-${index}`} className="border-b border-slate-100">
                                            <td className="px-5 py-3 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                                            <td className="px-5 py-3 text-slate-600">{entry.description}</td>
                                            <td className="px-5 py-3 text-slate-600">{entry.debit > 0 ? currencyFormatter.format(entry.debit) : '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{entry.credit > 0 ? currencyFormatter.format(entry.credit) : '—'}</td>
                                            <td className="px-5 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={entry.isReconciled}
                                                    disabled={toggleMutation.isPending}
                                                    onChange={(e) =>
                                                        toggleMutation.mutate({
                                                            sourceType: entry.sourceType,
                                                            sourceId: entry.sourceId,
                                                            isReconciled: e.target.checked,
                                                        })
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}