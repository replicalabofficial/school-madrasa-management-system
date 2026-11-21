import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, FileDown, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { financialStatementsApi } from '../../api/financialStatementsApi'
import { brandingApi } from '../../api/brandingApi'
import { printHtml, buildBrandedHeader } from '../../utils/printHtml'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import type { IncomeStatement } from '../../types/financialStatements'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

export function IncomeStatementPage() {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const now = new Date()
    const [dateFrom, setDateFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
    const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10))

    const query = useQuery<IncomeStatement, ApiErrorPayload>({
        queryKey: ['income-statement', dateFrom, dateTo],
        queryFn: () => financialStatementsApi.getIncomeStatement(dateFrom || undefined, dateTo || undefined),
    })

    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.get,
    })

    function handlePrint() {
        if (!query.data) return

        const header = buildBrandedHeader(
            `Income Statement (${dateFrom || 'Start'} to ${dateTo || 'Today'})`,
            brandingQuery.data?.institutionName,
            brandingQuery.data?.logoPath,
            API_ORIGIN,
        )

        const section = (title: string, lines: { accountDescription: string; balance: number }[], total: number) => `
            <h3>${title}</h3>
            <table>
                <tbody>
                    ${lines.map((l) => `<tr><td>${l.accountDescription}</td><td>${currencyFormatter.format(l.balance)}</td></tr>`).join('')}
                </tbody>
                <tfoot><tr><th>Total ${title}</th><th>${currencyFormatter.format(total)}</th></tr></tfoot>
            </table>
        `

        const html = `
            ${header}
            ${section('Income', query.data.incomeLines, query.data.totalIncome)}
            ${section('Expenses', query.data.expenseLines, query.data.totalExpenses)}
            <p style="margin-top:16px;"><strong>Net Income: ${currencyFormatter.format(query.data.netIncome)}</strong></p>
        `

        printHtml('Income Statement', html)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Income Statement</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isHeadOffice ? 'Profit & Loss for the selected period.' : 'Profit & Loss for your branch, for the selected period.'}
                </p>
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
                    <span className="ml-2 text-sm">Loading...</span>
                </div>
            )}

            {query.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load income statement</p>
                        <p className="mt-1 text-sm text-red-600">{query.error.message}</p>
                    </div>
                </Card>
            )}

            {query.data && (
                <>
                    <Button variant="secondary" onClick={handlePrint}>
                        <FileDown className="mr-1.5 h-4 w-4" />
                        Export PDF
                    </Button>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="p-6">
                            <h2 className="font-semibold text-slate-900">Income</h2>
                            <div className="mt-3 space-y-2">
                                {query.data.incomeLines.length === 0 ? (
                                    <p className="text-sm text-slate-400">No income recorded for this period.</p>
                                ) : (
                                    query.data.incomeLines.map((line) => (
                                        <div key={line.accountDescription} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{line.accountDescription}</span>
                                            <span className="font-medium text-emerald-700">{currencyFormatter.format(line.balance)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
                                <span>Total Income</span>
                                <span className="text-emerald-700">{currencyFormatter.format(query.data.totalIncome)}</span>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h2 className="font-semibold text-slate-900">Expenses</h2>
                            <div className="mt-3 space-y-2">
                                {query.data.expenseLines.length === 0 ? (
                                    <p className="text-sm text-slate-400">No expenses recorded for this period.</p>
                                ) : (
                                    query.data.expenseLines.map((line) => (
                                        <div key={line.accountDescription} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{line.accountDescription}</span>
                                            <span className="font-medium text-red-700">{currencyFormatter.format(line.balance)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
                                <span>Total Expenses</span>
                                <span className="text-red-700">{currencyFormatter.format(query.data.totalExpenses)}</span>
                            </div>
                        </Card>
                    </div>

                    <Card className={`p-6 ${query.data.netIncome >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-base font-semibold text-slate-900">
                                {query.data.netIncome >= 0 ? 'Net Profit' : 'Net Loss'}
                            </span>
                            <span className={`text-xl font-bold ${query.data.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {currencyFormatter.format(Math.abs(query.data.netIncome))}
                            </span>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}