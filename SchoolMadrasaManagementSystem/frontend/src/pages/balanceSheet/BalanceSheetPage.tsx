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
import type { BalanceSheet } from '../../types/financialStatements'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

export function BalanceSheetPage() {
    const [asOfDate, setAsOfDate] = useState('')

    const query = useQuery<BalanceSheet, ApiErrorPayload>({
        queryKey: ['balance-sheet', asOfDate],
        queryFn: () => financialStatementsApi.getBalanceSheet(asOfDate || undefined),
    })

    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.get,
    })

    function handlePrint() {
        if (!query.data) return

        const header = buildBrandedHeader(
            'Balance Sheet',
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
            ${section('Assets', query.data.assets, query.data.totalAssets)}
            ${section('Liabilities', query.data.liabilities, query.data.totalLiabilities)}
            ${section('Equity', query.data.equity, query.data.totalEquity)}
            <p style="margin-top:16px;"><strong>Total Liabilities + Equity: ${currencyFormatter.format(query.data.totalLiabilitiesAndEquity)}</strong></p>
        `

        printHtml('Balance Sheet', html)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Balance Sheet</h1>
                <p className="mt-1 text-sm text-slate-500">Assets, liabilities and equity as of a given date.</p>
            </div>

            <Card className="flex flex-wrap items-end gap-4 p-4">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">As of Date</label>
                    <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
                </div>
            </Card>

            {query.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading balance sheet...</span>
                </div>
            )}

            {query.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load balance sheet</p>
                        <p className="mt-1 text-sm text-red-600">{query.error.message}</p>
                    </div>
                </Card>
            )}

            {query.data && (
                <>
                    <Button variant="secondary" onClick={handlePrint}>
                        <Download className="mr-1.5 h-4 w-4" />
                        Export PDF
                    </Button>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="p-6">
                            <h2 className="font-semibold text-slate-900">Assets</h2>
                            <div className="mt-3 space-y-2">
                                {query.data.assets.length === 0 ? (
                                    <p className="text-sm text-slate-400">No asset balances recorded.</p>
                                ) : (
                                    query.data.assets.map((line) => (
                                        <div key={line.accountDescription} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{line.accountDescription}</span>
                                            <span className="font-medium text-slate-900">{currencyFormatter.format(line.balance)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
                                <span>Total Assets</span>
                                <span>{currencyFormatter.format(query.data.totalAssets)}</span>
                            </div>
                        </Card>

                        <div className="space-y-6">
                            <Card className="p-6">
                                <h2 className="font-semibold text-slate-900">Liabilities</h2>
                                <div className="mt-3 space-y-2">
                                    {query.data.liabilities.length === 0 ? (
                                        <p className="text-sm text-slate-400">No liability balances recorded.</p>
                                    ) : (
                                        query.data.liabilities.map((line) => (
                                            <div key={line.accountDescription} className="flex justify-between text-sm">
                                                <span className="text-slate-600">{line.accountDescription}</span>
                                                <span className="font-medium text-slate-900">{currencyFormatter.format(line.balance)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
                                    <span>Total Liabilities</span>
                                    <span>{currencyFormatter.format(query.data.totalLiabilities)}</span>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h2 className="font-semibold text-slate-900">Equity</h2>
                                <div className="mt-3 space-y-2">
                                    {query.data.equity.length === 0 ? (
                                        <p className="text-sm text-slate-400">No equity balances recorded.</p>
                                    ) : (
                                        query.data.equity.map((line) => (
                                            <div key={line.accountDescription} className="flex justify-between text-sm">
                                                <span className="text-slate-600">{line.accountDescription}</span>
                                                <span className="font-medium text-slate-900">{currencyFormatter.format(line.balance)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
                                    <span>Total Equity</span>
                                    <span>{currencyFormatter.format(query.data.totalEquity)}</span>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span>Total Liabilities + Equity</span>
                                    <span>{currencyFormatter.format(query.data.totalLiabilitiesAndEquity)}</span>
                                </div>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}