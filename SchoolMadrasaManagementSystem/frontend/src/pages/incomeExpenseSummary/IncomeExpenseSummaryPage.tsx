import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Download, FileDown, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { incomeApi } from '../../api/incomeApi'
import { expensesApi } from '../../api/expensesApi'
import { brandingApi } from '../../api/brandingApi'
import { useAuthStore } from '../../stores/authStore'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { buildBrandedHeader, printHtml } from '../../utils/printHtml'
import type { FinancialEntry } from '../../types/incomeExpense'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

interface BranchSummary {
    branchId: number
    branchName: string
    totalIncome: number
    totalExpense: number
}

function toCsv(rows: BranchSummary[]): string {
    const headers = ['Branch', 'Total Income', 'Total Expense', 'Net']
    const lines = [
        headers.join(','),
        ...rows.map((r) => [r.branchName, r.totalIncome, r.totalExpense, r.totalIncome - r.totalExpense].join(',')),
    ]
    return lines.join('\n')
}

function downloadCsv(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

export function IncomeExpenseSummaryPage() {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const incomeQuery = useQuery<FinancialEntry[], ApiErrorPayload>({
        queryKey: ['income'],
        queryFn: incomeApi.getAll,
    })
    const expenseQuery = useQuery<FinancialEntry[], ApiErrorPayload>({
        queryKey: ['expenses'],
        queryFn: expensesApi.getAll,
    })
    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.get,
    })

    function inRange(dateStr: string) {
        const d = new Date(dateStr)
        if (dateFrom && d < new Date(dateFrom)) return false
        if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false
        return true
    }

    const summaries = useMemo<BranchSummary[]>(() => {
        const income = (incomeQuery.data ?? []).filter((e) => inRange(e.date))
        const expense = (expenseQuery.data ?? []).filter((e) => inRange(e.date))

        const map = new Map<number, BranchSummary>()

        for (const e of income) {
            const key = e.branchId
            const existing = map.get(key) ?? { branchId: key, branchName: e.branch?.name ?? '—', totalIncome: 0, totalExpense: 0 }
            existing.totalIncome += e.amount
            map.set(key, existing)
        }

        for (const e of expense) {
            const key = e.branchId
            const existing = map.get(key) ?? { branchId: key, branchName: e.branch?.name ?? '—', totalIncome: 0, totalExpense: 0 }
            existing.totalExpense += e.amount
            map.set(key, existing)
        }

        return Array.from(map.values()).sort((a, b) => a.branchName.localeCompare(b.branchName))
    }, [incomeQuery.data, expenseQuery.data, dateFrom, dateTo])

    const overallIncome = summaries.reduce((s, r) => s + r.totalIncome, 0)
    const overallExpense = summaries.reduce((s, r) => s + r.totalExpense, 0)

    function exportOverallPdf() {
        const header = buildBrandedHeader('Income & Expense Summary', brandingQuery.data?.institutionName, brandingQuery.data?.logoPath, API_ORIGIN)
        const rows = summaries
            .map((r) => `<tr><td>${r.branchName}</td><td>${currencyFormatter.format(r.totalIncome)}</td><td>${currencyFormatter.format(r.totalExpense)}</td><td>${currencyFormatter.format(r.totalIncome - r.totalExpense)}</td></tr>`)
            .join('')
        const html = `
            ${header}
            <table>
                <thead><tr><th>Branch</th><th>Total Income</th><th>Total Expense</th><th>Net</th></tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr><th>Overall</th><th>${currencyFormatter.format(overallIncome)}</th><th>${currencyFormatter.format(overallExpense)}</th><th>${currencyFormatter.format(overallIncome - overallExpense)}</th></tr></tfoot>
            </table>
        `
        printHtml('Income & Expense Summary', html)
    }

    function exportBranchPdf(summary: BranchSummary) {
        const header = buildBrandedHeader(`Income & Expense Summary — ${summary.branchName}`, brandingQuery.data?.institutionName, brandingQuery.data?.logoPath, API_ORIGIN)
        const html = `
            ${header}
            <table>
                <thead><tr><th>Total Income</th><th>Total Expense</th><th>Net</th></tr></thead>
                <tbody><tr><td>${currencyFormatter.format(summary.totalIncome)}</td><td>${currencyFormatter.format(summary.totalExpense)}</td><td>${currencyFormatter.format(summary.totalIncome - summary.totalExpense)}</td></tr></tbody>
            </table>
        `
        printHtml(`Income & Expense Summary - ${summary.branchName}`, html)
    }

    const isLoading = incomeQuery.isLoading || expenseQuery.isLoading
    const error = incomeQuery.error ?? expenseQuery.error

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Income &amp; Expense Summary</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isHeadOffice ? 'Total income and expense per branch.' : 'Total income and expense for your branch.'}
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

            {isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading...</span>
                </div>
            )}

            {error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load data</p>
                        <p className="mt-1 text-sm text-red-600">{error.message}</p>
                    </div>
                </Card>
            )}

            {!isLoading && summaries.length > 0 && (
                <>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => downloadCsv('income-expense-summary.csv', toCsv(summaries))}>
                            <Download className="mr-1.5 h-4 w-4" />
                            Export CSV (Overall)
                        </Button>
                        <Button variant="secondary" onClick={exportOverallPdf}>
                            <FileDown className="mr-1.5 h-4 w-4" />
                            Export PDF (Overall)
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {summaries.map((summary) => (
                            <Card key={summary.branchId} className="p-5">
                                <h2 className="font-semibold text-slate-900">{summary.branchName}</h2>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Total Income</span>
                                        <span className="font-medium text-emerald-700">{currencyFormatter.format(summary.totalIncome)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Total Expense</span>
                                        <span className="font-medium text-red-700">{currencyFormatter.format(summary.totalExpense)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
                                        <span className="text-slate-700">Net</span>
                                        <span className="text-slate-900">{currencyFormatter.format(summary.totalIncome - summary.totalExpense)}</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            downloadCsv(`income-expense-${summary.branchName}.csv`, toCsv([summary]))
                                        }
                                    >
                                        CSV
                                    </Button>
                                    <Button variant="secondary" onClick={() => exportBranchPdf(summary)}>
                                        PDF
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {isHeadOffice && summaries.length > 1 && (
                        <Card className="p-5">
                            <h2 className="font-semibold text-slate-900">Overall (All Branches)</h2>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Total Income</span>
                                    <span className="font-medium text-emerald-700">{currencyFormatter.format(overallIncome)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Total Expense</span>
                                    <span className="font-medium text-red-700">{currencyFormatter.format(overallExpense)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
                                    <span className="text-slate-700">Net</span>
                                    <span className="text-slate-900">{currencyFormatter.format(overallIncome - overallExpense)}</span>
                                </div>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {!isLoading && summaries.length === 0 && (
                <Card className="p-6">
                    <p className="text-sm text-slate-400">No income or expense records found for the selected period.</p>
                </Card>
            )}
        </div>
    )
}