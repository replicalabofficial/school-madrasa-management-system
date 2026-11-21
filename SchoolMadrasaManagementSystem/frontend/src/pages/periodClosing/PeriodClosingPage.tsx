import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CalendarCheck, Loader2, Lock, LockOpen, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { periodClosingApi } from '../../api/periodClosingApi'
import type { ApiErrorPayload } from '../../api/client'
import type { JournalVoucher } from '../../types/journalVoucher'
import type { PeriodLock, YearEndPreview } from '../../types/periodClosing'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
const money = (value: number) => currencyFormatter.format(value)
const fmtDate = (value: string | null | undefined) => (value ? new Date(value).toLocaleDateString() : '—')

export function PeriodClosingPage() {
    const queryClient = useQueryClient()

    const [lockDate, setLockDate] = useState('')
    const [lockError, setLockError] = useState<string | null>(null)
    const [confirmUnlock, setConfirmUnlock] = useState(false)

    const [yearEndDate, setYearEndDate] = useState('')
    const [lockBooks, setLockBooks] = useState(true)
    const [preview, setPreview] = useState<YearEndPreview | null>(null)
    const [yearError, setYearError] = useState<string | null>(null)
    const [confirmClose, setConfirmClose] = useState(false)
    const [reopenTarget, setReopenTarget] = useState<JournalVoucher | null>(null)

    const lockQuery = useQuery<PeriodLock, ApiErrorPayload>({
        queryKey: ['period-lock'],
        queryFn: periodClosingApi.getLock,
    })

    const closingsQuery = useQuery<JournalVoucher[], ApiErrorPayload>({
        queryKey: ['year-end-closings'],
        queryFn: periodClosingApi.getClosings,
    })

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['period-lock'] })
        queryClient.invalidateQueries({ queryKey: ['year-end-closings'] })
        queryClient.invalidateQueries({ queryKey: ['journal-vouchers'] })
        queryClient.invalidateQueries({ queryKey: ['ledger-report'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }

    const lockMutation = useMutation({
        mutationFn: (value: string | null) => periodClosingApi.setLock(value),
        onSuccess: () => {
            invalidateAll()
            setLockDate('')
            setLockError(null)
            setConfirmUnlock(false)
        },
        onError: (err) => {
            setLockError((err as ApiErrorPayload).message ?? 'Failed to update the lock.')
            setConfirmUnlock(false)
        },
    })

    const previewMutation = useMutation({
        mutationFn: (value: string) => periodClosingApi.previewYearEnd(value),
        onSuccess: (data) => {
            setPreview(data)
            setYearError(null)
        },
        onError: (err) => setYearError((err as ApiErrorPayload).message ?? 'Failed to load preview.'),
    })

    const closeMutation = useMutation({
        mutationFn: periodClosingApi.closeYear,
        onSuccess: () => {
            invalidateAll()
            setPreview(null)
            setYearEndDate('')
            setConfirmClose(false)
            setYearError(null)
        },
        onError: (err) => {
            setYearError((err as ApiErrorPayload).message ?? 'Failed to close the year.')
            setConfirmClose(false)
        },
    })

    const reopenMutation = useMutation({
        mutationFn: (id: number) => periodClosingApi.reopenYear(id),
        onSuccess: () => {
            invalidateAll()
            setReopenTarget(null)
        },
        onError: (err) => {
            alert((err as ApiErrorPayload).message ?? 'Failed to reopen the year.')
            setReopenTarget(null)
        },
    })

    const currentLock = lockQuery.data?.lockedUpTo ?? null

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Period Closing</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Lock completed periods so old entries cannot be changed, and close the financial year.
                </p>
            </div>

            {/* Period lock */}
            <Card className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2.5 ${currentLock ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {currentLock ? <Lock className="h-5 w-5" /> : <LockOpen className="h-5 w-5" />}
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">Books lock</h2>
                            {lockQuery.isLoading ? (
                                <p className="text-sm text-slate-400">Loading...</p>
                            ) : currentLock ? (
                                <p className="text-sm text-slate-600">
                                    Locked up to <strong>{fmtDate(currentLock)}</strong>
                                    {lockQuery.data?.updatedByName ? ` · by ${lockQuery.data.updatedByName}` : ''}. Fees, income, expenses,
                                    salaries, opening balances and journal vouchers on or before this date cannot be added, changed or deleted.
                                </p>
                            ) : (
                                <p className="text-sm text-slate-600">No period is locked. All dates can be edited.</p>
                            )}
                        </div>
                    </div>
                    {currentLock && (
                        <Button variant="secondary" onClick={() => setConfirmUnlock(true)}>
                            <LockOpen className="mr-1.5 h-4 w-4" />
                            Remove lock
                        </Button>
                    )}
                </div>

                {lockError && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{lockError}</div>}

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Lock books up to (including)</label>
                        <Input type="date" value={lockDate} onChange={(e) => setLockDate(e.target.value)} className="w-48" />
                    </div>
                    <Button onClick={() => lockDate && lockMutation.mutate(lockDate)} disabled={!lockDate || lockMutation.isPending}>
                        <Lock className="mr-1.5 h-4 w-4" />
                        {lockMutation.isPending ? 'Saving...' : 'Lock'}
                    </Button>
                </div>
                <p className="text-xs text-slate-500">Tip: after a month is checked, lock up to the last day of that month (e.g. 31 Oct).</p>
            </Card>

            {/* Year-end closing */}
            <Card className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
                        <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-slate-900">Year-end closing</h2>
                        <p className="text-sm text-slate-600">
                            Moves the year's surplus or deficit from income and expense accounts into <strong>Retained Earnings</strong>, so the
                            new year starts from zero. The Income Statement for the closed year still shows its real figures.
                        </p>
                    </div>
                </div>

                {yearError && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{yearError}</div>}

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Year ends on</label>
                        <Input
                            type="date"
                            value={yearEndDate}
                            onChange={(e) => {
                                setYearEndDate(e.target.value)
                                setPreview(null)
                            }}
                            className="w-48"
                        />
                    </div>
                    <Button variant="secondary" onClick={() => yearEndDate && previewMutation.mutate(yearEndDate)} disabled={!yearEndDate || previewMutation.isPending}>
                        {previewMutation.isPending ? 'Loading...' : 'Preview'}
                    </Button>
                </div>

                {preview && (
                    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <p className="text-xs text-slate-500">Total income</p>
                                <p className="text-lg font-bold text-slate-900">{money(preview.totalIncome)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Total expenses</p>
                                <p className="text-lg font-bold text-slate-900">{money(preview.totalExpenses)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">{preview.netIncome >= 0 ? 'Surplus' : 'Deficit'} to Retained Earnings</p>
                                <p className={`text-lg font-bold ${preview.netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(preview.netIncome)}</p>
                            </div>
                        </div>

                        {preview.lines.length === 0 ? (
                            <p className="text-sm text-slate-400">Nothing to close up to this date.</p>
                        ) : (
                            <div className="max-h-72 overflow-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="py-2 pr-4 font-medium">Account</th>
                                            <th className="py-2 pr-4 font-medium">Branch</th>
                                            <th className="py-2 font-medium">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.lines.map((l, i) => (
                                            <tr key={i} className="border-b border-slate-100">
                                                <td className="py-1.5 pr-4 text-slate-700">{l.accountId} – {l.accountDescription}</td>
                                                <td className="py-1.5 pr-4 text-slate-500">{l.branchName}</td>
                                                <td className={`py-1.5 ${l.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>{money(l.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={lockBooks} onChange={(e) => setLockBooks(e.target.checked)} />
                            Also lock the books up to {fmtDate(preview.yearEndDate)} (recommended)
                        </label>

                        <Button onClick={() => setConfirmClose(true)} disabled={preview.lines.length === 0 || closeMutation.isPending}>
                            {closeMutation.isPending ? 'Closing...' : 'Close the year'}
                        </Button>
                    </div>
                )}
            </Card>

            {/* History */}
            <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">Closed years</h2>
                </div>
                {closingsQuery.isLoading ? (
                    <div className="flex items-center gap-2 p-5 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                ) : closingsQuery.error ? (
                    <div className="flex items-start gap-2 p-5 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" /> {closingsQuery.error.message}
                    </div>
                ) : (closingsQuery.data ?? []).length === 0 ? (
                    <p className="p-5 text-sm text-slate-400">No year has been closed yet.</p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200 text-slate-500">
                                <th className="px-5 py-3 font-medium">Entry</th>
                                <th className="px-5 py-3 font-medium">Year end</th>
                                <th className="px-5 py-3 font-medium">Amount closed</th>
                                <th className="px-5 py-3 font-medium">By</th>
                                <th className="px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(closingsQuery.data ?? []).map((c) => (
                                <tr key={c.id} className="border-b border-slate-100">
                                    <td className="px-5 py-3 font-medium text-slate-800">{c.entryNumber}</td>
                                    <td className="px-5 py-3 text-slate-600">{fmtDate(c.date)}</td>
                                    <td className="px-5 py-3 text-slate-900">{money(c.totalDebit)}</td>
                                    <td className="px-5 py-3 text-slate-500">{c.createdByName || '—'}</td>
                                    <td className="px-5 py-3">
                                        <button
                                            type="button"
                                            onClick={() => setReopenTarget(c)}
                                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                                        >
                                            <RotateCcw className="h-4 w-4" /> Reopen
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            <ConfirmDialog
                open={confirmUnlock}
                title="Remove lock"
                description="All past entries will become editable again. Continue?"
                confirmLabel="Remove lock"
                variant="danger"
                loading={lockMutation.isPending}
                onCancel={() => setConfirmUnlock(false)}
                onConfirm={() => lockMutation.mutate(null)}
            />

            <ConfirmDialog
                open={confirmClose}
                title="Close the year"
                description={`Close the year ending ${fmtDate(preview?.yearEndDate)} and move ${money(preview?.netIncome ?? 0)} to Retained Earnings?${lockBooks ? ' The books will also be locked up to this date.' : ''}`}
                confirmLabel="Close year"
                variant="primary"
                loading={closeMutation.isPending}
                onCancel={() => setConfirmClose(false)}
                onConfirm={() => preview && closeMutation.mutate({ yearEndDate: preview.yearEndDate.slice(0, 10), lockBooks })}
            />

            <ConfirmDialog
                open={reopenTarget !== null}
                title="Reopen year"
                description={`Remove the closing entry ${reopenTarget?.entryNumber}? The lock date must be before ${fmtDate(reopenTarget?.date)} first.`}
                confirmLabel="Reopen"
                variant="danger"
                loading={reopenMutation.isPending}
                onCancel={() => setReopenTarget(null)}
                onConfirm={() => reopenTarget && reopenMutation.mutate(reopenTarget.id)}
            />
        </div>
    )
}