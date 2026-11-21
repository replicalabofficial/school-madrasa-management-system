import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Loader2, Printer, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { feeReportsApi } from '../../api/feeReportsApi'
import { brandingApi } from '../../api/brandingApi'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { buildBrandedHeader, printHtml } from '../../utils/printHtml'
import type { StudentLedger } from '../../types/feeReports'

const money = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
const fmt = (v: number) => money.format(v)
const date = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB') : '—')

function esc(v: string | number | null | undefined) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function StudentLedgerPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const navigate = useNavigate()
    const id = Number(studentId)

    const ledgerQuery = useQuery<StudentLedger, ApiErrorPayload>({
        queryKey: ['student-ledger', id],
        queryFn: () => feeReportsApi.studentLedger(id),
        enabled: id > 0,
    })
    const brandingQuery = useQuery({ queryKey: ['branding'], queryFn: brandingApi.get })
    const institution = brandingQuery.data?.institutionName

    const l = ledgerQuery.data

    function print() {
        if (!l) return
        const rows = l.lines
            .map(
                (x) =>
                    `<tr><td>${date(x.date)}</td><td>${esc(x.serialNumber)}</td><td>${esc(x.description)}</td><td class="text-right">${x.debit ? fmt(x.gross) : ''}</td><td class="text-right">${x.discount ? fmt(x.discount) : ''}</td><td class="text-right">${x.debit ? fmt(x.debit) : ''}</td><td class="text-right">${x.credit ? fmt(x.credit) : ''}</td><td class="text-right">${fmt(x.balance)}</td></tr>`,
            )
            .join('')
        const family = l.family.length
            ? `<h3 style="margin-top:20px">Family (siblings)</h3><table><thead><tr><th>GR</th><th>Name</th><th>Class</th><th>Status</th><th class="text-right">Due</th></tr></thead><tbody>${l.family
                  .map((m) => `<tr><td>${esc(m.grNumber)}</td><td>${esc(m.name)}</td><td>${esc(m.class)}</td><td>${m.isActive ? 'Studying' : 'Left'}</td><td class="text-right">${fmt(m.due)}</td></tr>`)
                  .join('')}</tbody></table><p><b>Family total due: Rs ${fmt(l.familyDue)}</b></p>`
            : ''
        printHtml(
            `Ledger ${l.grNumber}`,
            `${buildBrandedHeader('Student Fee Ledger', institution, brandingQuery.data?.logoPath, API_ORIGIN)}
             <p><b>${esc(l.name)}</b> · GR ${esc(l.grNumber)} · Class ${esc(l.class)} · ${esc(l.branchName)}${l.fatherName ? ' · Father: ' + esc(l.fatherName) : ''}${l.parentPhone ? ' · ' + esc(l.parentPhone) : ''}${l.isActive ? '' : ' · <b>LEFT ' + date(l.leftDate) + '</b>'}</p>
             <table><thead><tr><th>Date</th><th>Serial</th><th>Description</th><th class="text-right">Fee</th><th class="text-right">Discount</th><th class="text-right">Charged</th><th class="text-right">Paid</th><th class="text-right">Balance</th></tr></thead>
             <tbody>${rows}</tbody>
             <tfoot><tr><th colspan="3">Total</th><th class="text-right">${fmt(l.totalGross)}</th><th class="text-right">${fmt(l.totalDiscount)}</th><th class="text-right">${fmt(l.totalCharged)}</th><th class="text-right">${fmt(l.totalPaid)}</th><th class="text-right">${fmt(l.balance)}</th></tr></tfoot></table>
             ${family}`,
        )
    }

    return (
        <div className="space-y-6">
            <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" />
                Back
            </button>

            {ledgerQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading ledger...</span>
                </div>
            )}

            {ledgerQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-700">{ledgerQuery.error.message}</p>
                </Card>
            )}

            {l && (
                <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                {l.name} <span className="text-base font-medium text-slate-500">· GR {l.grNumber}</span>
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Class {l.class} · {l.branchName}
                                {l.fatherName && ` · Father: ${l.fatherName}`}
                                {l.parentPhone && ` · ${l.parentPhone}`}
                                {!l.isActive && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Left {date(l.leftDate)}</span>}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Monthly fee Rs {fmt(l.monthlyFee)}
                                {l.monthlyDiscount > 0 && ` · Discount Rs ${fmt(l.monthlyDiscount)} (${l.discountStatus === 'Approved' ? 'approved' : 'pending'})`}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link to={`/fees/student/${l.studentId}`}>
                                <Button variant="secondary">Receive fee</Button>
                            </Link>
                            <Button variant="secondary" onClick={print}>
                                <Printer className="mr-1.5 h-4 w-4" />
                                Print ledger
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <Stat label="Total fee" value={fmt(l.totalGross)} />
                        <Stat label="Discount" value={fmt(l.totalDiscount)} tone="amber" />
                        <Stat label="Charged" value={fmt(l.totalCharged)} />
                        <Stat label="Paid" value={fmt(l.totalPaid)} tone="emerald" />
                        <Stat label="Balance due" value={fmt(l.balance)} tone={l.balance > 0 ? 'red' : 'emerald'} hint={`${l.unpaidCount} unpaid fees`} />
                    </div>

                    {l.pendingDiscountAmount > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Rs {fmt(l.pendingDiscountAmount)} discount is waiting for Head Office approval and is not deducted yet.
                        </div>
                    )}

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Serial</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                        <th className="px-4 py-3 text-right font-medium">Fee</th>
                                        <th className="px-4 py-3 text-right font-medium">Discount</th>
                                        <th className="px-4 py-3 text-right font-medium">Charged</th>
                                        <th className="px-4 py-3 text-right font-medium">Paid</th>
                                        <th className="px-4 py-3 text-right font-medium">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {l.lines.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                                                No fees yet.
                                            </td>
                                        </tr>
                                    )}
                                    {l.lines.map((x, i) => (
                                        <tr key={`${x.feeId}-${x.type}-${i}`} className={`border-b border-slate-100 ${x.type === 'Payment' ? 'bg-emerald-50/40' : ''}`}>
                                            <td className="px-4 py-2.5 text-slate-600">{date(x.date)}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">{x.serialNumber}</td>
                                            <td className="px-4 py-2.5 text-slate-700">
                                                {x.description}
                                                {x.discountStatus === 'PendingApproval' && <span className="ml-1 text-xs text-amber-600">(discount pending)</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-slate-600">{x.debit ? fmt(x.gross) : ''}</td>
                                            <td className="px-4 py-2.5 text-right text-amber-700">{x.discount ? fmt(x.discount) : ''}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-800">{x.debit ? fmt(x.debit) : ''}</td>
                                            <td className="px-4 py-2.5 text-right text-emerald-700">{x.credit ? fmt(x.credit) : ''}</td>
                                            <td className={`px-4 py-2.5 text-right font-medium ${x.balance > 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(x.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <Users className="h-4 w-4" />
                                Family (siblings by father CNIC / phone)
                            </span>
                            {l.family.length > 0 && (
                                <span className="flex items-center gap-3 text-sm">
                                    <span>
                                        Family total due: <b className={l.familyDue > 0 ? 'text-red-600' : 'text-emerald-700'}>Rs {fmt(l.familyDue)}</b>
                                    </span>
                                </span>
                            )}
                        </div>
                        {l.family.length === 0 ? (
                            <p className="p-5 text-sm text-slate-400">
                                {l.fatherCnic || l.parentPhone ? 'No siblings found with the same father CNIC or phone.' : 'Add father CNIC or parent phone on the student to find siblings.'}
                            </p>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <tbody>
                                    {l.family.map((m) => (
                                        <tr key={m.studentId} className="border-b border-slate-100">
                                            <td className="px-5 py-2.5 font-medium text-slate-800">{m.grNumber}</td>
                                            <td className="px-5 py-2.5">
                                                <Link to={`/fees/ledger/${m.studentId}`} className="text-emerald-700 hover:underline">
                                                    {m.name}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-2.5 text-slate-600">{m.class}</td>
                                            <td className="px-5 py-2.5 text-slate-600">{m.branchName}</td>
                                            <td className="px-5 py-2.5 text-xs">{m.isActive ? <span className="text-emerald-700">Studying</span> : <span className="text-red-600">Left {date(m.leftDate)}</span>}</td>
                                            <td className={`px-5 py-2.5 text-right font-medium ${m.due > 0 ? 'text-red-600' : 'text-slate-500'}`}>Rs {fmt(m.due)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </>
            )}
        </div>
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
