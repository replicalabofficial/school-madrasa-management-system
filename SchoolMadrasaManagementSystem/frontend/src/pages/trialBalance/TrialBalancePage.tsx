import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Download, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { financialStatementsApi } from '../../api/financialStatementsApi'
import { printHtml, buildBrandedHeader } from '../../utils/printHtml'
import { brandingApi } from '../../api/brandingApi'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import type { TrialBalanceRow } from '../../types/financialStatements'


const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

export function TrialBalancePage() {
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const query = useQuery<TrialBalanceRow[], ApiErrorPayload>({
        queryKey: ['trial-balance', dateFrom, dateTo],
        queryFn: () => financialStatementsApi.getTrialBalance(dateFrom || undefined, dateTo || undefined),
    })

    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.get,
    })

    const totalDebit = (query.data ?? []).reduce((sum, r) => sum + r.debit, 0)
    const totalCredit = (query.data ?? []).reduce((sum, r) => sum + r.credit, 0)

    function handlePrint() {
        if (!query.data) return

        const header = buildBrandedHeader(
            'Trial Balance',
            brandingQuery.data?.institutionName,
            brandingQuery.data?.logoPath,
            API_ORIGIN,
        )

        const rows = query.data
            .map(
                (r) => `
                <tr>
                    <td>${r.accountId}</td>
                    <td>${r.accountDescription}</td>
                    <td>${r.debit > 0 ? currencyFormatter.format(r.debit) : '-'}</td>
                    <td>${r.credit > 0 ? currencyFormatter.format(r.credit) : '-'}</td>
                </tr>
            `,
            )
            .join('')

        const html = `
            ${header}
            <table>
                <thead><tr><th>Account ID</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr><th colspan="2">Total</th><th>${currencyFormatter.format(totalDebit)}</th><th>${currencyFormatter.format(totalCredit)}</th></tr>
                </tfoot>
            </table>
        `

        printHtml('Trial Balance', html)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trial Balance</h1>
                <p className="mt-1 text-sm text-slate-500">Debit and credit totals for every account.</p>
            </div>

            <Card className="flex flex-wrap items-end gap-4 p-4">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                </div>
            </Card>

            {query.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading trial balance...</span>
                </div>
            )}

            {query.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load trial balance</p>
                        <p className="mt-1 text-sm text-red-600">{query.error.message}</p>
                    </div>
                </Card>
            )}

            {query.data && query.data.length > 0 && (
                <Button variant="secondary" onClick={handlePrint}>
                    <Download className="mr-1.5 h-4 w-4" />
                    Export PDF
                </Button>
            )}

            {query.data && (
                <Card className="overflow-hidden">
                    {query.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No transactions recorded yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Account ID</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        <th className="px-5 py-3 font-medium">Debit</th>
                                        <th className="px-5 py-3 font-medium">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {query.data.map((row) => (
                                        <tr key={row.chartOfAccountId} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{row.accountId}</td>
                                            <td className="px-5 py-3 text-slate-600">{row.accountDescription}</td>
                                            <td className="px-5 py-3 text-slate-600">{row.debit > 0 ? currencyFormatter.format(row.debit) : '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{row.credit > 0 ? currencyFormatter.format(row.credit) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 font-semibold">
                                        <td colSpan={2} className="px-5 py-3 text-slate-900">Total</td>
                                        <td className="px-5 py-3 text-slate-900">{currencyFormatter.format(totalDebit)}</td>
                                        <td className="px-5 py-3 text-slate-900">{currencyFormatter.format(totalCredit)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}