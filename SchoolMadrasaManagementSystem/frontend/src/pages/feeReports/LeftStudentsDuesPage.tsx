import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, Printer, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { feeReportsApi } from '../../api/feeReportsApi'
import { branchesApi } from '../../api/branchesApi'
import { brandingApi } from '../../api/brandingApi'
import { useAuthStore } from '../../stores/authStore'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { buildBrandedHeader, printHtml } from '../../utils/printHtml'
import type { LeftStudentsDues } from '../../types/feeReports'

const money = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
const fmt = (v: number) => money.format(v)
const date = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB') : '—')
const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

function esc(v: string | number | null | undefined) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function LeftStudentsDuesPage() {
    const user = useAuthStore((s) => s.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [branchId, setBranchId] = useState<number | ''>('')
    const [search, setSearch] = useState('')
    const [onlyWithSiblings, setOnlyWithSiblings] = useState(false)

    const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll, enabled: isHeadOffice })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)
    const brandingQuery = useQuery({ queryKey: ['branding'], queryFn: brandingApi.get })
    const institution = brandingQuery.data?.institutionName

    const duesQuery = useQuery<LeftStudentsDues, ApiErrorPayload>({
        queryKey: ['left-students-dues', branchId],
        queryFn: () => feeReportsApi.leftStudentsDues(branchId === '' ? undefined : Number(branchId)),
    })
    const data = duesQuery.data

    const rows = useMemo(() => {
        let r = data?.rows ?? []
        if (onlyWithSiblings) r = r.filter((x) => x.activeSiblings.length > 0)
        const term = search.trim().toLowerCase()
        if (term) {
            r = r.filter(
                (x) =>
                    x.name.toLowerCase().includes(term) ||
                    x.grNumber.toLowerCase().includes(term) ||
                    (x.fatherName ?? '').toLowerCase().includes(term) ||
                    (x.parentPhone ?? '').includes(term),
            )
        }
        return r
    }, [data, search, onlyWithSiblings])

    function print() {
        if (!data) return
        printHtml(
            'Left Students Dues',
            `${buildBrandedHeader('Left Students — Outstanding Dues', institution, brandingQuery.data?.logoPath, API_ORIGIN)}
             <p>${rows.length} students · Total due Rs ${fmt(rows.reduce((t, x) => t + x.due, 0))}</p>
             <table><thead><tr><th>GR</th><th>Name</th><th>Class</th><th>Left</th><th>Father / Phone</th><th class="text-right">Fees</th><th class="text-right">Due</th><th>Siblings studying</th></tr></thead>
             <tbody>${rows
                 .map(
                     (x) =>
                         `<tr><td>${esc(x.grNumber)}</td><td>${esc(x.name)}</td><td>${esc(x.class)}</td><td>${date(x.leftDate)}</td><td>${esc(x.fatherName)} ${esc(x.parentPhone)}</td><td class="text-right">${x.unpaidCount}</td><td class="text-right">${fmt(x.due)}</td><td>${x.activeSiblings.map((s) => `${esc(s.name)} (${esc(s.class)})`).join(', ')}</td></tr>`,
                 )
                 .join('')}</tbody></table>`,
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Left Students Dues</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Students who left with unpaid fees. Where a brother or sister is still studying, the dues can be recovered through the family.
                    </p>
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
                <div className="relative max-w-xs flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, GR, father, phone..." className="pl-10" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={onlyWithSiblings} onChange={(e) => setOnlyWithSiblings(e.target.checked)} />
                    Only with siblings still studying
                </label>
            </div>

            {duesQuery.isLoading && (
                <div className="flex min-h-[20vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {duesQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-700">{duesQuery.error.message}</p>
                </Card>
            )}

            {data && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card className="p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Left students with dues</p>
                            <p className="mt-1 text-xl font-bold text-slate-900">{data.studentCount}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total outstanding</p>
                            <p className="mt-1 text-xl font-bold text-red-600">Rs {fmt(data.totalDue)}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recoverable through siblings</p>
                            <p className="mt-1 text-xl font-bold text-emerald-700">Rs {fmt(data.recoverableAmount)}</p>
                            <p className="mt-1 text-xs text-slate-500">{data.recoverableThroughSiblings} families still have a child studying</p>
                        </Card>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-4 py-3 font-medium">GR</th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Class</th>
                                        {isHeadOffice && <th className="px-4 py-3 font-medium">Branch</th>}
                                        <th className="px-4 py-3 font-medium">Left</th>
                                        <th className="px-4 py-3 font-medium">Father / Phone</th>
                                        <th className="px-4 py-3 text-right font-medium">Due</th>
                                        <th className="px-4 py-3 font-medium">Siblings studying</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                                                No left students with dues.
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map((x) => (
                                        <tr key={x.studentId} className="border-b border-slate-100 align-top">
                                            <td className="px-4 py-2.5 font-medium text-slate-800">{x.grNumber}</td>
                                            <td className="px-4 py-2.5">
                                                <Link to={`/fees/ledger/${x.studentId}`} className="text-emerald-700 hover:underline">
                                                    {x.name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600">{x.class}</td>
                                            {isHeadOffice && <td className="px-4 py-2.5 text-slate-600">{x.branchName}</td>}
                                            <td className="px-4 py-2.5 text-slate-600">{date(x.leftDate)}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-600">
                                                {x.fatherName ?? '—'}
                                                {x.parentPhone && <div className="text-slate-400">{x.parentPhone}</div>}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                                                Rs {fmt(x.due)}
                                                <div className="text-xs font-normal text-slate-400">{x.unpaidCount} fees · since {date(x.oldestDueDate)}</div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs">
                                                {x.activeSiblings.length === 0 ? (
                                                    <span className="text-slate-400">—</span>
                                                ) : (
                                                    x.activeSiblings.map((s) => (
                                                        <div key={s.studentId}>
                                                            <Link to={`/fees/ledger/${s.studentId}`} className="text-emerald-700 hover:underline">
                                                                {s.name}
                                                            </Link>{' '}
                                                            <span className="text-slate-500">({s.class})</span>
                                                        </div>
                                                    ))
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}
