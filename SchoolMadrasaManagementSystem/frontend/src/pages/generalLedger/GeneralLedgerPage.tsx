import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Download, FileDown, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ledgerApi } from '../../api/ledgerApi'
import { brandingApi } from '../../api/brandingApi'
import { useAuthStore } from '../../stores/authStore'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { buildBrandedHeader, printHtml } from '../../utils/printHtml'
import type { LedgerAccountOption, LedgerReport } from '../../types/ledgerReport'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
const money = (value: number) => currencyFormatter.format(value)

// Escape text before putting it into printable HTML
function esc(value: string | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function csvCell(value: string | number): string {
    return `"${String(value).replace(/"/g, '""')}"`
}

function periodLabel(dateFrom: string, dateTo: string): string {
    if (dateFrom && dateTo) return `${new Date(dateFrom).toLocaleDateString()} – ${new Date(dateTo).toLocaleDateString()}`
    if (dateFrom) return `From ${new Date(dateFrom).toLocaleDateString()}`
    if (dateTo) return `Up to ${new Date(dateTo).toLocaleDateString()}`
    return 'All dates'
}

function exportLedgerCsv(report: LedgerReport, period: string) {
    const lines = [
        [csvCell('Account'), csvCell(`${report.accountId} - ${report.accountDescription}`)].join(','),
        [csvCell('Period'), csvCell(period)].join(','),
        '',
        ['Date', 'Description', 'Branch', 'Debit', 'Credit', 'Balance'].map(csvCell).join(','),
        ['', 'Opening Balance', '', '', '', report.openingBalance].map(csvCell).join(','),
        ...report.entries.map((r) =>
            [new Date(r.date).toLocaleDateString(), r.description, r.branchName, r.debit, r.credit, r.runningBalance]
                .map(csvCell)
                .join(','),
        ),
        ['', 'Total', '', report.totalDebit, report.totalCredit, ''].map(csvCell).join(','),
        ['', 'Closing Balance', '', '', '', report.closingBalance].map(csvCell).join(','),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ledger-${report.accountId}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

function exportLedgerPdf(report: LedgerReport, period: string, institutionName?: string, logoPath?: string | null) {
    const bodyRows = report.entries
        .map(
            (r) => `
            <tr>
                <td>${esc(new Date(r.date).toLocaleDateString())}</td>
                <td>${esc(r.description)}</td>
                <td>${esc(r.branchName)}</td>
                <td>${r.debit > 0 ? money(r.debit) : '-'}</td>
                <td>${r.credit > 0 ? money(r.credit) : '-'}</td>
                <td>${money(r.runningBalance)}</td>
            </tr>`,
        )
        .join('')

    const header = buildBrandedHeader('Account Ledger', institutionName, logoPath, API_ORIGIN)

    const html = `
        ${header}
        <p><strong>Account:</strong> ${esc(report.accountId)} – ${esc(report.accountDescription)}<br/>
        <strong>Period:</strong> ${esc(period)}</p>
        <table>
            <thead><tr><th>Date</th><th>Description</th><th>Branch</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
            <tbody>
                <tr><td></td><td><strong>Opening Balance</strong></td><td></td><td></td><td></td><td><strong>${money(report.openingBalance)}</strong></td></tr>
                ${bodyRows}
                <tr><td></td><td><strong>Total</strong></td><td></td><td><strong>${money(report.totalDebit)}</strong></td><td><strong>${money(report.totalCredit)}</strong></td><td></td></tr>
                <tr><td></td><td><strong>Closing Balance</strong></td><td></td><td></td><td></td><td><strong>${money(report.closingBalance)}</strong></td></tr>
            </tbody>
        </table>
    `

    printHtml('Account Ledger', html)
}

export function GeneralLedgerPage() {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [accountId, setAccountId] = useState<number | ''>('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const accountsQuery = useQuery<LedgerAccountOption[], ApiErrorPayload>({
        queryKey: ['ledger-accounts'],
        queryFn: ledgerApi.getAccounts,
    })

    const reportQuery = useQuery<LedgerReport, ApiErrorPayload>({
        queryKey: ['ledger-report', accountId, dateFrom, dateTo],
        queryFn: () => ledgerApi.getReport(accountId === '' ? undefined : accountId, dateFrom || undefined, dateTo || undefined),
    })

    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.get,
    })

    const report = reportQuery.data
    const period = periodLabel(dateFrom, dateTo)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">General Ledger</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Opening balance, every transaction and closing balance for any account
                    {isHeadOffice ? ' across all branches.' : ' for your branch.'}
                </p>
            </div>

            <Card className="flex flex-wrap items-end gap-4 p-4">
                <div className="min-w-[260px] flex-1 sm:flex-none">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Account</label>
                    <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                        <option value="">Cash (default)</option>
                        {(accountsQuery.data ?? []).map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.accountId} – {a.accountDescription} ({a.accountType})
                            </option>
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
            </Card>

            {reportQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading ledger...</span>
                </div>
            )}

            {reportQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load ledger</p>
                        <p className="mt-1 text-sm text-red-600">{reportQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {report && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Card className="p-5">
                            <p className="text-sm text-slate-500">Opening Balance</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{money(report.openingBalance)}</p>
                            <p className="mt-1 text-xs text-slate-400">{dateFrom ? `Before ${new Date(dateFrom).toLocaleDateString()}` : 'Start of records'}</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-sm text-slate-500">Total Debit</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{money(report.totalDebit)}</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-sm text-slate-500">Total Credit</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{money(report.totalCredit)}</p>
                        </Card>
                        <Card className="border-emerald-200 bg-emerald-50 p-5">
                            <p className="text-sm text-emerald-700">Closing Balance</p>
                            <p className="mt-2 text-2xl font-bold text-emerald-800">{money(report.closingBalance)}</p>
                            <p className="mt-1 text-xs text-emerald-700/70">{dateTo ? `As of ${new Date(dateTo).toLocaleDateString()}` : 'As of today'}</p>
                        </Card>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700">
                            {report.accountId} – {report.accountDescription} · <span className="text-slate-500">{period}</span>
                        </p>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => exportLedgerCsv(report, period)}>
                                <Download className="mr-1.5 h-4 w-4" />
                                Export CSV
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    exportLedgerPdf(report, period, brandingQuery.data?.institutionName, brandingQuery.data?.logoPath)
                                }
                            >
                                <FileDown className="mr-1.5 h-4 w-4" />
                                Export PDF
                            </Button>
                        </div>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Branch</th>}
                                        <th className="px-5 py-3 font-medium">Debit</th>
                                        <th className="px-5 py-3 font-medium">Credit</th>
                                        <th className="px-5 py-3 font-medium">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-200 bg-slate-50/70">
                                        <td className="px-5 py-3 text-slate-500">{dateFrom ? new Date(dateFrom).toLocaleDateString() : '—'}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-800">Opening Balance</td>
                                        {isHeadOffice && <td className="px-5 py-3" />}
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3 font-semibold text-slate-900">{money(report.openingBalance)}</td>
                                    </tr>

                                    {report.entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={isHeadOffice ? 6 : 5} className="px-5 py-6 text-center text-sm text-slate-400">
                                                No transactions in this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        report.entries.map((entry, index) => (
                                            <tr key={index} className="border-b border-slate-100">
                                                <td className="px-5 py-3 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 text-slate-600">{entry.description}</td>
                                                {isHeadOffice && <td className="px-5 py-3 text-slate-600">{entry.branchName}</td>}
                                                <td className="px-5 py-3 text-slate-600">{entry.debit > 0 ? money(entry.debit) : '—'}</td>
                                                <td className="px-5 py-3 text-slate-600">{entry.credit > 0 ? money(entry.credit) : '—'}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{money(entry.runningBalance)}</td>
                                            </tr>
                                        ))
                                    )}

                                    <tr className="border-t border-slate-200 bg-slate-50/70">
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3 font-semibold text-slate-800">Total</td>
                                        {isHeadOffice && <td className="px-5 py-3" />}
                                        <td className="px-5 py-3 font-semibold text-slate-900">{money(report.totalDebit)}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-900">{money(report.totalCredit)}</td>
                                        <td className="px-5 py-3" />
                                    </tr>
                                    <tr className="bg-emerald-50">
                                        <td className="px-5 py-3 text-slate-500">{dateTo ? new Date(dateTo).toLocaleDateString() : '—'}</td>
                                        <td className="px-5 py-3 font-semibold text-emerald-800">Closing Balance</td>
                                        {isHeadOffice && <td className="px-5 py-3" />}
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3 font-bold text-emerald-800">{money(report.closingBalance)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}