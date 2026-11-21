import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { feeReportsApi } from '../../api/feeReportsApi'
import { branchesApi } from '../../api/branchesApi'
import { brandingApi } from '../../api/brandingApi'
import { useAuthStore } from '../../stores/authStore'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { buildBrandedHeader, printHtml } from '../../utils/printHtml'
import { MONTHS, buildYearOptions } from '../../utils/feeSerial'
import { FEE_CATEGORIES } from '../../types/fee'
import type { ClassFeeSummary, ClassFeeSummaryRow } from '../../types/feeReports'

const money = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
const fmt = (v: number) => money.format(v)
const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

export function ClassFeeSummaryPage() {
    const user = useAuthStore((s) => s.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'
    const now = new Date()

    const [branchId, setBranchId] = useState<number | ''>('')
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [category, setCategory] = useState('Monthly Fee')

    const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll, enabled: isHeadOffice })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)
    const brandingQuery = useQuery({ queryKey: ['branding'], queryFn: brandingApi.get })

    useEffect(() => {
        if (!isHeadOffice) setBranchId(user?.branchId ?? '')
    }, [isHeadOffice, user?.branchId])

    const summaryQuery = useQuery<ClassFeeSummary, ApiErrorPayload>({
        queryKey: ['class-fee-summary', branchId, month, year, category],
        queryFn: () => feeReportsApi.classSummary({ branchId: branchId === '' ? undefined : Number(branchId), month, year, category: category || undefined }),
    })
    const data = summaryQuery.data

    function print() {
        if (!data) return
        const tr = (r: ClassFeeSummaryRow, bold = false) => {
            const c = bold ? 'th' : 'td'
            return `<tr><${c}>${r.class}</${c}><${c} class="text-right">${r.activeStudents}</${c}><${c} class="text-right">${fmt(r.gross)}</${c}><${c} class="text-right">${fmt(r.discount)}</${c}><${c} class="text-right">${fmt(r.net)}</${c}><${c} class="text-right">${fmt(r.received)}</${c}><${c} class="text-right">${fmt(r.balance)}</${c}></tr>`
        }
        printHtml(
            `Class Fee Summary ${data.period}`,
            `${buildBrandedHeader(`Class Fee Summary — ${data.period}`, brandingQuery.data?.institutionName, brandingQuery.data?.logoPath, API_ORIGIN)}
             <p>${data.branchName} · ${category || 'All fee types'}</p>
             <table><thead><tr><th>Class</th><th class="text-right">Students</th><th class="text-right">Fee</th><th class="text-right">Discount</th><th class="text-right">Net</th><th class="text-right">Received</th><th class="text-right">Balance</th></tr></thead>
             <tbody>${data.rows.map((r) => tr(r)).join('')}</tbody><tfoot>${tr(data.total, true)}</tfoot></table>
             <div class="signatures"><div>Accountant</div><div>Principal</div><div>Head Office</div></div>`,
        )
    }

    const t = data?.total
    const collectedPct = t && t.net > 0 ? Math.round((t.received / t.net) * 100) : 0

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Fee Summary</h1>
                    <p className="mt-1 text-sm text-slate-500">Per class: students, fee, discount, net receivable, received and balance for a month.</p>
                </div>
                <Button variant="secondary" onClick={print} disabled={!data}>
                    <Printer className="mr-1.5 h-4 w-4" />
                    Print
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {isHeadOffice && (
                    <select value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')} className={selectClass}>
                        <option value="">All branches</option>
                        {activeBranches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                )}
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectClass}>
                    {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>
                            {m}
                        </option>
                    ))}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
                    {buildYearOptions().map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                    <option value="">All fee types</option>
                    {FEE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            {summaryQuery.isLoading && (
                <div className="flex min-h-[20vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {summaryQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-700">{summaryQuery.error.message}</p>
                </Card>
            )}

            {data && t && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <Stat label="Fee (before discount)" value={fmt(t.gross)} />
                        <Stat label="Discount" value={fmt(t.discount)} tone="amber" hint={t.gross > 0 ? `${Math.round((t.discount / t.gross) * 100)}% of fee` : undefined} />
                        <Stat label="Net receivable" value={fmt(t.net)} />
                        <Stat label="Received" value={fmt(t.received)} tone="emerald" hint={`${collectedPct}% collected`} />
                        <Stat label="Balance" value={fmt(t.balance)} tone={t.balance > 0 ? 'red' : 'emerald'} hint={`${t.unpaidCount} unpaid fees`} />
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Class</th>
                                        <th className="px-5 py-3 text-right font-medium">Students</th>
                                        <th className="px-5 py-3 text-right font-medium">Fees</th>
                                        <th className="px-5 py-3 text-right font-medium">Fee</th>
                                        <th className="px-5 py-3 text-right font-medium">Discount</th>
                                        <th className="px-5 py-3 text-right font-medium">Net</th>
                                        <th className="px-5 py-3 text-right font-medium">Received</th>
                                        <th className="px-5 py-3 text-right font-medium">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rows.map((r) => (
                                        <Row key={r.class} r={r} />
                                    ))}
                                    {data.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-6 text-center text-slate-400">
                                                No fees for {data.period}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-50 font-semibold">
                                    <Row r={t} />
                                </tfoot>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}

function Row({ r }: { r: ClassFeeSummaryRow }) {
    return (
        <tr className="border-b border-slate-100">
            <td className="px-5 py-2.5 font-medium text-slate-800">{r.class}</td>
            <td className="px-5 py-2.5 text-right text-slate-600">{r.activeStudents}</td>
            <td className="px-5 py-2.5 text-right text-slate-600">{r.feeCount}</td>
            <td className="px-5 py-2.5 text-right text-slate-600">{fmt(r.gross)}</td>
            <td className="px-5 py-2.5 text-right text-amber-700">{fmt(r.discount)}</td>
            <td className="px-5 py-2.5 text-right text-slate-800">{fmt(r.net)}</td>
            <td className="px-5 py-2.5 text-right text-emerald-700">{fmt(r.received)}</td>
            <td className={`px-5 py-2.5 text-right ${r.balance > 0 ? 'text-red-600' : 'text-slate-600'}`}>{fmt(r.balance)}</td>
        </tr>
    )
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'amber' | 'emerald' | 'red' }) {
    const color = tone === 'amber' ? 'text-amber-700' : tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-600' : 'text-slate-900'
    return (
        <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>Rs {value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </Card>
    )
}
