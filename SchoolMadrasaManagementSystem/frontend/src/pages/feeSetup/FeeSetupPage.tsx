import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Copy, Loader2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { feeStructuresApi } from '../../api/feeSetupApi'
import { branchesApi } from '../../api/branchesApi'
import type { ApiErrorPayload } from '../../api/client'
import type { ApplyFeeStructureResult, FeeStructure, FeeStructurePayload } from '../../types/feeSetup'

const money = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'
const cellInput = 'w-24 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm focus:border-emerald-600 focus:outline-none'

type Draft = Omit<FeeStructurePayload, 'branchId' | 'session'>

const emptyDraft: Draft = { class: '', monthlyFee: 0, newAdmissionMonthlyFee: 0, admissionFee: 0, formFee: 0, stationeryFee: 0 }

function currentSession(): string {
    // Session starts in January: 2026 -> "2026-27"
    const y = new Date().getFullYear()
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
}

function nextSession(session: string): string {
    const y = Number(session.slice(0, 4))
    if (!y) return currentSession()
    return `${y + 1}-${String((y + 2) % 100).padStart(2, '0')}`
}

const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0))

export function FeeSetupPage() {
    const queryClient = useQueryClient()

    const [branchId, setBranchId] = useState<number | ''>('')
    const [session, setSession] = useState(currentSession())
    const [edits, setEdits] = useState<Record<number, Draft>>({})
    const [draft, setDraft] = useState<Draft>(emptyDraft)
    const [error, setError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null)
    const [copyOpen, setCopyOpen] = useState(false)
    const [copyTo, setCopyTo] = useState('')
    const [copyPercent, setCopyPercent] = useState('0')
    const [copyBusy, setCopyBusy] = useState(false)
    const [applyOpen, setApplyOpen] = useState(false)

    const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    useEffect(() => {
        if (branchId === '' && activeBranches.length > 0) setBranchId(activeBranches[0].id)
    }, [activeBranches, branchId])

    const sessionsQuery = useQuery({ queryKey: ['fee-structure-sessions'], queryFn: feeStructuresApi.sessions })
    const sessionOptions = useMemo(() => {
        const set = new Set([currentSession(), ...(sessionsQuery.data ?? [])])
        if (session) set.add(session)
        return Array.from(set).sort().reverse()
    }, [sessionsQuery.data, session])

    const rowsQuery = useQuery<FeeStructure[], ApiErrorPayload>({
        queryKey: ['fee-structures', branchId, session],
        queryFn: () => feeStructuresApi.getAll({ branchId: Number(branchId), session }),
        enabled: branchId !== '' && !!session,
    })
    const rows = rowsQuery.data ?? []

    function refresh() {
        queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
        queryClient.invalidateQueries({ queryKey: ['fee-structure-sessions'] })
    }

    const createMutation = useMutation({
        mutationFn: feeStructuresApi.create,
        onSuccess: () => {
            setDraft(emptyDraft)
            refresh()
        },
        onError: (err) => setError((err as ApiErrorPayload).message),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: FeeStructurePayload }) => feeStructuresApi.update(id, payload),
        onSuccess: (_, vars) => {
            setEdits((e) => {
                const next = { ...e }
                delete next[vars.id]
                return next
            })
            refresh()
        },
        onError: (err) => setError((err as ApiErrorPayload).message),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => feeStructuresApi.delete(id),
        onSuccess: () => {
            setDeleteTarget(null)
            refresh()
        },
        onError: (err) => {
            setError((err as ApiErrorPayload).message)
            setDeleteTarget(null)
        },
    })

    function rowValue(row: FeeStructure): Draft {
        return (
            edits[row.id] ?? {
                class: row.class,
                monthlyFee: row.monthlyFee,
                newAdmissionMonthlyFee: row.newAdmissionMonthlyFee,
                admissionFee: row.admissionFee,
                formFee: row.formFee,
                stationeryFee: row.stationeryFee,
            }
        )
    }

    function setRowField(row: FeeStructure, field: keyof Draft, value: string) {
        const current = rowValue(row)
        setEdits((e) => ({ ...e, [row.id]: { ...current, [field]: field === 'class' ? value : num(value) } }))
    }

    function addRow() {
        setError(null)
        if (branchId === '') return setError('Select a branch.')
        if (!draft.class.trim()) return setError('Enter the class name.')
        if (draft.monthlyFee <= 0) return setError('Enter the monthly fee.')
        createMutation.mutate({ ...draft, class: draft.class.trim(), branchId: Number(branchId), session })
    }

    async function copySession() {
        setError(null)
        const target = copyTo.trim()
        if (!target) return setError('Enter the new session (e.g. 2027-28).')
        if (target === session) return setError('New session must be different.')
        const pct = Number(copyPercent) || 0
        const round = (v: number) => Math.round((v * (1 + pct / 100)) / 50) * 50 // round to nearest 50

        setCopyBusy(true)
        const failed: string[] = []
        for (const r of rows) {
            try {
                await feeStructuresApi.create({
                    branchId: r.branchId,
                    session: target,
                    class: r.class,
                    monthlyFee: round(r.monthlyFee),
                    newAdmissionMonthlyFee: round(r.newAdmissionMonthlyFee),
                    admissionFee: r.admissionFee,
                    formFee: r.formFee,
                    stationeryFee: r.stationeryFee,
                })
            } catch (err) {
                failed.push(`${r.class}: ${(err as ApiErrorPayload).message}`)
            }
        }
        setCopyBusy(false)
        setCopyOpen(false)
        if (failed.length) setError(`Some classes were not copied — ${failed.join(' | ')}`)
        refresh()
        setSession(target)
    }

    const totals = rows.reduce((t, r) => t + r.monthlyFee, 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Setup</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Class-wise fees for each branch and session. New admissions get the new-admission fee; in August use “Apply to students” to update everyone.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setCopyTo(nextSession(session))
                            setCopyPercent('0')
                            setCopyOpen(true)
                        }}
                        disabled={rows.length === 0}
                    >
                        <Copy className="mr-1.5 h-4 w-4" />
                        Copy to new session
                    </Button>
                    <Button onClick={() => setApplyOpen(true)} disabled={rows.length === 0}>
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                        Apply to students
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <select value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')} className={selectClass}>
                    {activeBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                        </option>
                    ))}
                </select>
                <select value={session} onChange={(e) => setSession(e.target.value)} className={selectClass}>
                    {sessionOptions.map((s) => (
                        <option key={s} value={s}>
                            Session {s}
                        </option>
                    ))}
                </select>
                <span className="text-sm text-slate-500">{rows.length} classes</span>
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200 text-slate-500">
                                <th className="px-4 py-3 font-medium">Class</th>
                                <th className="px-4 py-3 text-right font-medium">Monthly fee</th>
                                <th className="px-4 py-3 text-right font-medium">New admission monthly</th>
                                <th className="px-4 py-3 text-right font-medium">Admission fee</th>
                                <th className="px-4 py-3 text-right font-medium">Form fee</th>
                                <th className="px-4 py-3 text-right font-medium">Stationery</th>
                                <th className="px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200 bg-emerald-50/40">
                                <td className="px-4 py-2">
                                    <Input
                                        value={draft.class}
                                        onChange={(e) => setDraft((d) => ({ ...d, class: e.target.value }))}
                                        placeholder="e.g. Nursery"
                                        className="w-36 py-1.5"
                                    />
                                </td>
                                {(['monthlyFee', 'newAdmissionMonthlyFee', 'admissionFee', 'formFee', 'stationeryFee'] as const).map((f) => (
                                    <td key={f} className="px-4 py-2 text-right">
                                        <input
                                            type="number"
                                            min={0}
                                            className={cellInput}
                                            value={draft[f] || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, [f]: num(e.target.value) }))}
                                            placeholder={f === 'newAdmissionMonthlyFee' ? 'same' : '0'}
                                        />
                                    </td>
                                ))}
                                <td className="px-4 py-2">
                                    <Button onClick={addRow} disabled={createMutation.isPending} className="py-1.5">
                                        <Plus className="mr-1 h-4 w-4" />
                                        Add
                                    </Button>
                                </td>
                            </tr>

                            {rowsQuery.isLoading && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                        Loading...
                                    </td>
                                </tr>
                            )}

                            {!rowsQuery.isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                                        No classes set up for this session yet. Add the first class above.
                                    </td>
                                </tr>
                            )}

                            {rows.map((row) => {
                                const v = rowValue(row)
                                const dirty = !!edits[row.id]
                                return (
                                    <tr key={row.id} className="border-b border-slate-100">
                                        <td className="px-4 py-2">
                                            <Input value={v.class} onChange={(e) => setRowField(row, 'class', e.target.value)} className="w-36 py-1.5 font-medium" />
                                        </td>
                                        {(['monthlyFee', 'newAdmissionMonthlyFee', 'admissionFee', 'formFee', 'stationeryFee'] as const).map((f) => (
                                            <td key={f} className="px-4 py-2 text-right">
                                                <input type="number" min={0} className={cellInput} value={v[f]} onChange={(e) => setRowField(row, f, e.target.value)} />
                                            </td>
                                        ))}
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-1">
                                                {dirty && (
                                                    <button
                                                        type="button"
                                                        onClick={() => updateMutation.mutate({ id: row.id, payload: { ...v, branchId: row.branchId, session: row.session } })}
                                                        className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50"
                                                        title="Save"
                                                        aria-label="Save"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(row)}
                                                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                    title="Delete"
                                                    aria-label="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {rows.length > 0 && (
                    <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                        Edit any amount and press the save icon on that row. Average monthly fee: Rs {money.format(totals / rows.length)}.
                    </p>
                )}
            </Card>

            {copyOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Copy to new session</h2>
                        </div>
                        <div className="space-y-4 px-5 py-4">
                            <p className="text-sm text-slate-600">
                                Copies all {rows.length} classes of session {session} into a new session. You can then edit any class.
                            </p>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">New session</label>
                                <Input value={copyTo} onChange={(e) => setCopyTo(e.target.value)} placeholder="2027-28" />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Increase monthly fees by (%)</label>
                                <Input type="number" value={copyPercent} onChange={(e) => setCopyPercent(e.target.value)} />
                                <p className="mt-1 text-xs text-slate-500">Rounded to the nearest Rs 50. Use 0 to copy as it is.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                            <Button variant="secondary" onClick={() => setCopyOpen(false)} disabled={copyBusy}>
                                Cancel
                            </Button>
                            <Button onClick={copySession} disabled={copyBusy}>
                                {copyBusy ? 'Copying...' : 'Copy'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {applyOpen && branchId !== '' && (
                <ApplyModal branchId={Number(branchId)} session={session} onClose={() => setApplyOpen(false)} onDone={() => queryClient.invalidateQueries({ queryKey: ['students'] })} />
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete class fee"
                description={`Delete the fee setup of "${deleteTarget?.class}" for session ${deleteTarget?.session}? Students keep their current fee.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    )
}

function ApplyModal({ branchId, session, onClose, onDone }: { branchId: number; session: string; onClose: () => void; onDone: () => void }) {
    const [skipIfLower, setSkipIfLower] = useState(true)
    const [result, setResult] = useState<ApplyFeeStructureResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    async function run(commit: boolean) {
        setBusy(true)
        setError(null)
        try {
            const r = await feeStructuresApi.apply({ branchId, session, skipIfLower, commit })
            setResult(r)
            if (commit) onDone()
        } catch (err) {
            setError((err as ApiErrorPayload).message)
        }
        setBusy(false)
    }

    useEffect(() => {
        run(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skipIfLower])

    const changes = (result?.rows ?? []).filter((r) => r.status !== 'NoChange')

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
            <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Apply session {session} fees to students</h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-3 border-b border-slate-200 px-5 py-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={skipIfLower} onChange={(e) => setSkipIfLower(e.target.checked)} disabled={busy || result?.committed} />
                        Never lower a student’s current fee (recommended — new admissions already on a higher fee stay as they are)
                    </label>
                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                    {result && (
                        <div className="flex flex-wrap gap-4 text-sm">
                            <span className="text-slate-600">Active students: <b>{result.totalStudents}</b></span>
                            <span className="text-emerald-700">Will change: <b>{result.changedCount}</b></span>
                            {result.noSetupCount > 0 && <span className="text-amber-700">Class not in setup: <b>{result.noSetupCount}</b></span>}
                            {result.committed && <span className="font-semibold text-emerald-700">Saved ✓</span>}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {busy && !result && (
                        <p className="p-5 text-sm text-slate-400">
                            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                            Checking...
                        </p>
                    )}
                    {result && changes.length === 0 && <p className="p-5 text-sm text-slate-500">All students already have this session’s fee. Nothing to change.</p>}
                    {changes.length > 0 && (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50">
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="px-4 py-2 font-medium">GR</th>
                                    <th className="px-4 py-2 font-medium">Name</th>
                                    <th className="px-4 py-2 font-medium">Class</th>
                                    <th className="px-4 py-2 text-right font-medium">Current</th>
                                    <th className="px-4 py-2 text-right font-medium">New</th>
                                    <th className="px-4 py-2 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {changes.map((r) => (
                                    <tr key={r.studentId} className="border-b border-slate-100">
                                        <td className="px-4 py-2 font-medium text-slate-800">{r.grNumber}</td>
                                        <td className="px-4 py-2 text-slate-600">{r.name}</td>
                                        <td className="px-4 py-2 text-slate-600">{r.class}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{money.format(r.oldFee)}</td>
                                        <td className="px-4 py-2 text-right font-medium text-slate-900">{money.format(r.newFee)}</td>
                                        <td className="px-4 py-2">
                                            {r.status === 'Change' && <span className="text-emerald-700">{result?.committed ? 'Updated' : 'Will update'}</span>}
                                            {r.status === 'Skipped' && <span className="text-slate-500">Kept (higher)</span>}
                                            {r.status === 'NoSetup' && <span className="text-amber-700">Class not in setup</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                    <Button variant="secondary" onClick={onClose}>
                        {result?.committed ? 'Close' : 'Cancel'}
                    </Button>
                    {!result?.committed && (
                        <Button onClick={() => run(true)} disabled={busy || !result || result.changedCount === 0}>
                            {busy ? 'Saving...' : `Update ${result?.changedCount ?? 0} students`}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
