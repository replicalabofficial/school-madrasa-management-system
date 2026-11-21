import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Eye, Loader2, Printer, Send, Undo2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { feePostingsApi } from '../../api/feeSetupApi'
import { studentsApi } from '../../api/studentsApi'
import { branchesApi } from '../../api/branchesApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { FeePostingListItem, FeePostingPreview, FeePostingRequest } from '../../types/feeSetup'
import { MONTHS, buildYearOptions } from '../../utils/feeSerial'
import { printHtml } from '../../utils/printHtml'

const money = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

export function FeePostingPage() {
    const queryClient = useQueryClient()
    const user = useAuthStore((s) => s.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'
    const now = new Date()

    const [branchId, setBranchId] = useState<number | ''>(isHeadOffice ? '' : (user?.branchId ?? ''))
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [className, setClassName] = useState('')
    const [feeDate, setFeeDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1, 12).toISOString().slice(0, 10))
    const [preview, setPreview] = useState<FeePostingPreview | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [confirmPost, setConfirmPost] = useState(false)
    const [undoTarget, setUndoTarget] = useState<FeePostingListItem | null>(null)
    const [showAll, setShowAll] = useState(false)

    const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll, enabled: isHeadOffice })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)
    useEffect(() => {
        if (isHeadOffice && branchId === '' && activeBranches.length > 0) setBranchId(activeBranches[0].id)
    }, [isHeadOffice, activeBranches, branchId])

    const studentsQuery = useQuery({ queryKey: ['students'], queryFn: studentsApi.getAll })
    const classes = useMemo(() => {
        const list = (studentsQuery.data ?? []).filter((s) => s.isActive && (branchId === '' || s.branchId === branchId)).map((s) => s.class)
        return Array.from(new Set(list)).sort(naturalSort)
    }, [studentsQuery.data, branchId])

    const historyQuery = useQuery({
        queryKey: ['fee-postings', branchId],
        queryFn: () => feePostingsApi.getAll(branchId === '' ? undefined : Number(branchId)),
        enabled: !isHeadOffice || branchId !== '',
    })

    // Changing any filter clears the old preview
    useEffect(() => {
        setPreview(null)
        setError(null)
    }, [branchId, month, year, className, feeDate])

    // Keep the fee date inside the selected month by default
    useEffect(() => {
        setFeeDate(new Date(year, month - 1, 1, 12).toISOString().slice(0, 10))
    }, [month, year])

    function request(): FeePostingRequest | null {
        if (branchId === '') {
            setError('Select a branch.')
            return null
        }
        return { branchId: Number(branchId), month, year, class: className || null, feeDate }
    }

    const previewMutation = useMutation({
        mutationFn: feePostingsApi.preview,
        onSuccess: (data) => setPreview(data),
        onError: (err) => setError((err as ApiErrorPayload).message),
    })

    const postMutation = useMutation({
        mutationFn: feePostingsApi.post,
        onSuccess: (data) => {
            setPreview(data)
            setConfirmPost(false)
            queryClient.invalidateQueries({ queryKey: ['fees'] })
            queryClient.invalidateQueries({ queryKey: ['fee-postings'] })
        },
        onError: (err) => {
            setConfirmPost(false)
            setError((err as ApiErrorPayload).message)
        },
    })

    const undoMutation = useMutation({
        mutationFn: (id: number) => feePostingsApi.undo(id),
        onSuccess: () => {
            setUndoTarget(null)
            setPreview(null)
            queryClient.invalidateQueries({ queryKey: ['fees'] })
            queryClient.invalidateQueries({ queryKey: ['fee-postings'] })
        },
        onError: (err) => {
            setUndoTarget(null)
            setError((err as ApiErrorPayload).message)
        },
    })

    const posted = preview?.postingId != null
    const visibleRows = (preview?.rows ?? []).filter((r) => showAll || r.status === 'New' || r.status === 'Posted')
    const pendingDiscounts = (preview?.rows ?? []).filter((r) => (r.status === 'New' || r.status === 'Posted') && r.discountStatus === 'PendingApproval').length
    const branchName = isHeadOffice ? activeBranches.find((b) => b.id === branchId)?.name ?? '' : 'Your branch'

    function printSummary() {
        if (!preview) return
        const rows = preview.classes
            .map((c) => `<tr><td>${c.class}</td><td class="r">${c.studentCount}</td><td class="r">${money.format(c.gross)}</td><td class="r">${money.format(c.discount)}</td><td class="r">${money.format(c.net)}</td></tr>`)
            .join('')
        printHtml(
            `Fee Posting ${preview.period}`,
            `<h2>Monthly Fee Posting — ${preview.period}</h2>
             <p>${branchName}${className ? ' · Class ' + className : ' · All classes'}</p>
             <table><thead><tr><th>Class</th><th class="r">Students</th><th class="r">Fee</th><th class="r">Discount</th><th class="r">Net receivable</th></tr></thead>
             <tbody>${rows}</tbody>
             <tfoot><tr><th>Total</th><th class="r">${preview.classes.reduce((t, c) => t + c.studentCount, 0)}</th><th class="r">${money.format(preview.grossTotal)}</th><th class="r">${money.format(preview.discountTotal)}</th><th class="r">${money.format(preview.netTotal)}</th></tr></tfoot></table>
             <style>table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}.r{text-align:right}</style>`,
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Fee Posting</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Creates this month’s fee for every active student at their own monthly fee, minus their discount. Each month can be posted only once per student.
                </p>
            </div>

            <Card className="p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {isHeadOffice && (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                            <select value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')} className={`${selectClass} w-full`}>
                                {activeBranches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Month</label>
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${selectClass} w-full`}>
                            {MONTHS.map((m, i) => (
                                <option key={m} value={i + 1}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Year</label>
                        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${selectClass} w-full`}>
                            {buildYearOptions().map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
                        <select value={className} onChange={(e) => setClassName(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All classes</option>
                            {classes.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee date</label>
                        <Input type="date" value={feeDate} onChange={(e) => setFeeDate(e.target.value)} />
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setError(null)
                            const r = request()
                            if (r) previewMutation.mutate(r)
                        }}
                        disabled={previewMutation.isPending}
                    >
                        {previewMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}
                        Preview
                    </Button>
                    <Button onClick={() => setConfirmPost(true)} disabled={!preview || posted || preview.newCount === 0}>
                        <Send className="mr-1.5 h-4 w-4" />
                        Post {preview && !posted ? `${preview.newCount} fees` : ''}
                    </Button>
                    {preview && (
                        <Button variant="ghost" onClick={printSummary}>
                            <Printer className="mr-1.5 h-4 w-4" />
                            Print summary
                        </Button>
                    )}
                </div>
            </Card>

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {preview && (
                <>
                    {posted && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            <CheckCircle2 className="h-4 w-4" />
                            {preview.newCount} fees for {preview.period} posted. They now appear in Fees as pending.
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Stat label={posted ? 'Fees posted' : 'Fees to post'} value={String(preview.newCount)} hint={`${preview.alreadyPostedCount} already posted · ${preview.noFeeCount} without fee`} />
                        <Stat label="Total fee" value={`Rs ${money.format(preview.grossTotal)}`} />
                        <Stat label="Discount" value={`Rs ${money.format(preview.discountTotal)}`} tone="amber" hint={pendingDiscounts ? `${pendingDiscounts} awaiting Head Office approval` : undefined} />
                        <Stat label="Net receivable" value={`Rs ${money.format(preview.netTotal)}`} tone="emerald" />
                    </div>

                    {preview.classes.length > 0 && (
                        <Card className="overflow-hidden">
                            <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800">Class-wise summary</div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="px-5 py-2.5 font-medium">Class</th>
                                            <th className="px-5 py-2.5 text-right font-medium">Students</th>
                                            <th className="px-5 py-2.5 text-right font-medium">Fee</th>
                                            <th className="px-5 py-2.5 text-right font-medium">Discount</th>
                                            <th className="px-5 py-2.5 text-right font-medium">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.classes.map((c) => (
                                            <tr key={c.class} className="border-b border-slate-100">
                                                <td className="px-5 py-2.5 font-medium text-slate-800">{c.class}</td>
                                                <td className="px-5 py-2.5 text-right text-slate-600">{c.studentCount}</td>
                                                <td className="px-5 py-2.5 text-right text-slate-600">{money.format(c.gross)}</td>
                                                <td className="px-5 py-2.5 text-right text-amber-700">{money.format(c.discount)}</td>
                                                <td className="px-5 py-2.5 text-right font-medium text-slate-900">{money.format(c.net)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    <Card className="overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <span className="text-sm font-semibold text-slate-800">Students</span>
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                                Also show already posted / no fee
                            </label>
                        </div>
                        <div className="max-h-[50vh] overflow-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-2.5 font-medium">GR</th>
                                        <th className="px-5 py-2.5 font-medium">Name</th>
                                        <th className="px-5 py-2.5 font-medium">Class</th>
                                        <th className="px-5 py-2.5 text-right font-medium">Fee</th>
                                        <th className="px-5 py-2.5 text-right font-medium">Discount</th>
                                        <th className="px-5 py-2.5 text-right font-medium">Net</th>
                                        <th className="px-5 py-2.5 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRows.map((r) => (
                                        <tr key={r.studentId} className="border-b border-slate-100">
                                            <td className="px-5 py-2.5 font-medium text-slate-800">{r.grNumber}</td>
                                            <td className="px-5 py-2.5 text-slate-600">{r.name}</td>
                                            <td className="px-5 py-2.5 text-slate-600">{r.class}</td>
                                            <td className="px-5 py-2.5 text-right text-slate-600">{money.format(r.gross)}</td>
                                            <td className="px-5 py-2.5 text-right text-amber-700">
                                                {r.discount ? money.format(r.discount) : '—'}
                                                {r.discountStatus === 'PendingApproval' && <span className="ml-1 text-xs text-amber-600">(pending)</span>}
                                            </td>
                                            <td className="px-5 py-2.5 text-right font-medium text-slate-900">{money.format(r.net)}</td>
                                            <td className="px-5 py-2.5 text-xs">
                                                {r.status === 'New' && <span className="text-emerald-700">Will post</span>}
                                                {r.status === 'Posted' && <span className="font-medium text-emerald-700">Posted ✓</span>}
                                                {r.status === 'AlreadyPosted' && <span className="text-slate-500">Already posted</span>}
                                                {r.status === 'NoFee' && <span className="text-amber-700">No monthly fee set</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleRows.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-6 text-center text-slate-400">
                                                Nothing new to post for this selection.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800">Posting history</div>
                {historyQuery.isLoading ? (
                    <p className="p-5 text-sm text-slate-400">Loading...</p>
                ) : (historyQuery.data ?? []).length === 0 ? (
                    <p className="p-5 text-sm text-slate-400">No postings yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="px-5 py-2.5 font-medium">Month</th>
                                    {isHeadOffice && <th className="px-5 py-2.5 font-medium">Branch</th>}
                                    <th className="px-5 py-2.5 font-medium">Class</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Students</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Fee</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Discount</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Net</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Paid</th>
                                    <th className="px-5 py-2.5 font-medium">Posted by</th>
                                    <th className="px-5 py-2.5 font-medium" />
                                </tr>
                            </thead>
                            <tbody>
                                {(historyQuery.data ?? []).map((p) => (
                                    <tr key={p.id} className="border-b border-slate-100">
                                        <td className="px-5 py-2.5 font-medium text-slate-800">{p.period}</td>
                                        {isHeadOffice && <td className="px-5 py-2.5 text-slate-600">{p.branchName}</td>}
                                        <td className="px-5 py-2.5 text-slate-600">{p.class ?? 'All'}</td>
                                        <td className="px-5 py-2.5 text-right text-slate-600">{p.studentCount}</td>
                                        <td className="px-5 py-2.5 text-right text-slate-600">{money.format(p.grossTotal)}</td>
                                        <td className="px-5 py-2.5 text-right text-amber-700">{money.format(p.discountTotal)}</td>
                                        <td className="px-5 py-2.5 text-right font-medium text-slate-900">{money.format(p.netTotal)}</td>
                                        <td className="px-5 py-2.5 text-right text-slate-600">{p.paidCount}</td>
                                        <td className="px-5 py-2.5 text-xs text-slate-500">
                                            {p.postedBy}
                                            <br />
                                            {new Date(p.postedAt).toLocaleString('en-PK')}
                                        </td>
                                        <td className="px-5 py-2.5">
                                            {p.paidCount === 0 && (
                                                <button type="button" onClick={() => setUndoTarget(p)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Undo posting" aria-label="Undo posting">
                                                    <Undo2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ConfirmDialog
                open={confirmPost}
                title={`Post ${preview?.period ?? ''} fees`}
                description={`${preview?.newCount ?? 0} fees will be created — net receivable Rs ${money.format(preview?.netTotal ?? 0)}. Continue?`}
                confirmLabel="Post fees"
                loading={postMutation.isPending}
                onCancel={() => setConfirmPost(false)}
                onConfirm={() => {
                    const r = request()
                    if (r) postMutation.mutate(r)
                }}
            />

            <ConfirmDialog
                open={undoTarget !== null}
                title="Undo posting"
                description={`Remove all ${undoTarget?.studentCount ?? 0} fees of ${undoTarget?.period ?? ''}${undoTarget?.class ? ' (' + undoTarget.class + ')' : ''}? Only possible because none of them is paid yet.`}
                confirmLabel="Undo posting"
                variant="danger"
                loading={undoMutation.isPending}
                onCancel={() => setUndoTarget(null)}
                onConfirm={() => undoTarget && undoMutation.mutate(undoTarget.id)}
            />
        </div>
    )
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'amber' | 'emerald' }) {
    const color = tone === 'amber' ? 'text-amber-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900'
    return (
        <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </Card>
    )
}
