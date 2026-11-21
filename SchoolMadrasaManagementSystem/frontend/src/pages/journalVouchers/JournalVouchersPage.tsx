import { Fragment, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ChevronDown, ChevronRight, Loader2, Plus, Printer, Trash2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { journalVouchersApi } from '../../api/journalVouchersApi'
import { ledgerApi } from '../../api/ledgerApi'
import { branchesApi } from '../../api/branchesApi'
import { brandingApi } from '../../api/brandingApi'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { buildBrandedHeader, printHtml } from '../../utils/printHtml'
import type { Branch } from '../../types/branch'
import type { LedgerAccountOption } from '../../types/ledgerReport'
import type { JournalVoucher } from '../../types/journalVoucher'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 })
const money = (value: number) => currencyFormatter.format(value)

const selectClass =
    'w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

function esc(value: string | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

interface LineForm {
    key: number
    accountId: number | ''
    branchId: number | ''
    debit: string
    credit: string
    note: string
}

let lineKey = 0
const newLine = (): LineForm => ({ key: ++lineKey, accountId: '', branchId: '', debit: '', credit: '', note: '' })
const today = () => new Date().toISOString().slice(0, 10)
const num = (v: string) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

function printVoucher(jv: JournalVoucher, institutionName?: string, logoPath?: string | null) {
    const rows = jv.lines
        .map(
            (l) => `<tr>
                <td>${esc(l.accountId)} – ${esc(l.accountDescription)}</td>
                <td>${esc(l.branchName)}</td>
                <td>${esc(l.note)}</td>
                <td>${l.debit > 0 ? money(l.debit) : ''}</td>
                <td>${l.credit > 0 ? money(l.credit) : ''}</td>
            </tr>`,
        )
        .join('')

    const html = `
        ${buildBrandedHeader('Journal Voucher', institutionName, logoPath, API_ORIGIN)}
        <p><strong>Voucher No:</strong> ${esc(jv.entryNumber)} &nbsp;&nbsp; <strong>Date:</strong> ${esc(new Date(jv.date).toLocaleDateString())}<br/>
        <strong>Description:</strong> ${esc(jv.description)}</p>
        <table>
            <thead><tr><th>Account</th><th>Branch</th><th>Note</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>
                ${rows}
                <tr><td colspan="3"><strong>Total</strong></td><td><strong>${money(jv.totalDebit)}</strong></td><td><strong>${money(jv.totalCredit)}</strong></td></tr>
            </tbody>
        </table>
        <p style="margin-top:48px;display:flex;justify-content:space-between">
            <span>Prepared by: ${esc(jv.createdByName)}</span>
            <span>Checked by: ____________</span>
            <span>Approved by: ____________</span>
        </p>`

    printHtml(`Journal Voucher ${jv.entryNumber}`, html)
}

export function JournalVouchersPage() {
    const queryClient = useQueryClient()

    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [expanded, setExpanded] = useState<number | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<JournalVoucher | null>(null)

    const [formOpen, setFormOpen] = useState(false)
    const [date, setDate] = useState(today())
    const [description, setDescription] = useState('')
    const [lines, setLines] = useState<LineForm[]>([newLine(), newLine()])
    const [formError, setFormError] = useState<string | null>(null)

    const listQuery = useQuery<JournalVoucher[], ApiErrorPayload>({
        queryKey: ['journal-vouchers', dateFrom, dateTo],
        queryFn: () => journalVouchersApi.getAll(dateFrom || undefined, dateTo || undefined),
    })

    const accountsQuery = useQuery<LedgerAccountOption[], ApiErrorPayload>({
        queryKey: ['ledger-accounts'],
        queryFn: ledgerApi.getAccounts,
    })

    const branchesQuery = useQuery<Branch[], ApiErrorPayload>({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
    })

    const brandingQuery = useQuery({ queryKey: ['branding'], queryFn: brandingApi.get })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['journal-vouchers'] })
        queryClient.invalidateQueries({ queryKey: ['ledger-report'] })
        queryClient.invalidateQueries({ queryKey: ['general-ledger'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }

    const createMutation = useMutation({
        mutationFn: journalVouchersApi.create,
        onSuccess: () => {
            invalidate()
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to save journal voucher.'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => journalVouchersApi.delete(id),
        onSuccess: () => {
            invalidate()
            setDeleteTarget(null)
        },
        onError: (err) => {
            alert((err as ApiErrorPayload).message ?? 'Failed to delete journal voucher.')
            setDeleteTarget(null)
        },
    })

    function openForm() {
        setDate(today())
        setDescription('')
        setLines([newLine(), newLine()])
        setFormError(null)
        setFormOpen(true)
    }

    function closeForm() {
        setFormOpen(false)
        setFormError(null)
    }

    function updateLine(key: number, patch: Partial<LineForm>) {
        setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)))
    }

    const totalDebit = lines.reduce((s, l) => s + num(l.debit), 0)
    const totalCredit = lines.reduce((s, l) => s + num(l.credit), 0)
    const difference = Math.round((totalDebit - totalCredit) * 100) / 100
    const isBalanced = totalDebit > 0 && difference === 0

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        if (!date) return setFormError('Date is required.')
        if (!description.trim()) return setFormError('Description is required.')

        const filled = lines.filter((l) => l.accountId !== '' || num(l.debit) > 0 || num(l.credit) > 0)
        if (filled.length < 2) return setFormError('Enter at least two lines.')

        for (let i = 0; i < filled.length; i++) {
            const l = filled[i]
            if (l.accountId === '') return setFormError(`Line ${i + 1}: select an account.`)
            const d = num(l.debit)
            const c = num(l.credit)
            if ((d > 0) === (c > 0)) return setFormError(`Line ${i + 1}: enter either Debit or Credit.`)
        }

        if (!isBalanced) return setFormError(`Debit and Credit must be equal. Difference: ${money(Math.abs(difference))}`)

        createMutation.mutate({
            date,
            description: description.trim(),
            lines: filled.map((l) => ({
                chartOfAccountId: Number(l.accountId),
                branchId: l.branchId === '' ? null : Number(l.branchId),
                debit: num(l.debit),
                credit: num(l.credit),
                note: l.note.trim() || undefined,
            })),
        })
    }

    const vouchers = listQuery.data ?? []

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Journal Vouchers</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manual accounting entries — corrections, cash deposited to bank, depreciation and adjustments.
                    </p>
                </div>
                <Button onClick={openForm}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    New Journal Voucher
                </Button>
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

            {listQuery.isLoading && (
                <div className="flex min-h-[25vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading journal vouchers...</span>
                </div>
            )}

            {listQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-700">{listQuery.error.message}</p>
                </Card>
            )}

            {listQuery.data && (
                <Card className="overflow-hidden">
                    {vouchers.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No journal vouchers yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="w-8 px-3 py-3" />
                                        <th className="px-4 py-3 font-medium">Voucher No</th>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                        <th className="px-4 py-3 font-medium">Amount</th>
                                        <th className="px-4 py-3 font-medium">By</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vouchers.map((jv) => (
                                        <Fragment key={jv.id}>
                                            <tr className="border-b border-slate-100">
                                                <td className="px-3 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpanded(expanded === jv.id ? null : jv.id)}
                                                        className="rounded p-1 text-slate-500 hover:bg-slate-100"
                                                        aria-label="Show lines"
                                                    >
                                                        {expanded === jv.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {jv.entryNumber}
                                                    {jv.entryType === 'YearEndClosing' && (
                                                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Year-end</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{new Date(jv.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-slate-600">{jv.description}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{money(jv.totalDebit)}</td>
                                                <td className="px-4 py-3 text-slate-500">{jv.createdByName || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => printVoucher(jv, brandingQuery.data?.institutionName, brandingQuery.data?.logoPath)}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                            title="Print"
                                                            aria-label="Print voucher"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </button>
                                                        {jv.entryType === 'Manual' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTarget(jv)}
                                                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                                title="Delete"
                                                                aria-label="Delete voucher"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expanded === jv.id && (
                                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                                    <td />
                                                    <td colSpan={6} className="px-4 py-3">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-slate-500">
                                                                    <th className="pb-1 text-left font-medium">Account</th>
                                                                    <th className="pb-1 text-left font-medium">Branch</th>
                                                                    <th className="pb-1 text-left font-medium">Note</th>
                                                                    <th className="pb-1 text-left font-medium">Debit</th>
                                                                    <th className="pb-1 text-left font-medium">Credit</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {jv.lines.map((l) => (
                                                                    <tr key={l.id} className="text-slate-700">
                                                                        <td className="py-1">{l.accountId} – {l.accountDescription}</td>
                                                                        <td className="py-1">{l.branchName}</td>
                                                                        <td className="py-1">{l.note || '—'}</td>
                                                                        <td className="py-1">{l.debit > 0 ? money(l.debit) : ''}</td>
                                                                        <td className="py-1">{l.credit > 0 ? money(l.credit) : ''}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {formOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">New Journal Voucher</h2>
                            <button type="button" onClick={closeForm} disabled={createMutation.isPending} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                                    <Input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Cash deposited in Meezan Bank" />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-slate-500">
                                            <th className="pb-2 pr-2 font-medium">Account</th>
                                            <th className="pb-2 pr-2 font-medium">Branch</th>
                                            <th className="w-32 pb-2 pr-2 font-medium">Debit</th>
                                            <th className="w-32 pb-2 pr-2 font-medium">Credit</th>
                                            <th className="pb-2 pr-2 font-medium">Note</th>
                                            <th className="w-8 pb-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l) => (
                                            <tr key={l.key}>
                                                <td className="pb-2 pr-2">
                                                    <select value={l.accountId} onChange={(e) => updateLine(l.key, { accountId: e.target.value ? Number(e.target.value) : '' })} className={selectClass}>
                                                        <option value="">Select account</option>
                                                        {(accountsQuery.data ?? []).map((a) => (
                                                            <option key={a.id} value={a.id}>
                                                                {a.accountId} – {a.accountDescription}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="pb-2 pr-2">
                                                    <select value={l.branchId} onChange={(e) => updateLine(l.key, { branchId: e.target.value ? Number(e.target.value) : '' })} className={selectClass}>
                                                        <option value="">All / Institution</option>
                                                        {(branchesQuery.data ?? []).map((b) => (
                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="pb-2 pr-2">
                                                    <Input type="number" min="0" step="0.01" value={l.debit} onChange={(e) => updateLine(l.key, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} />
                                                </td>
                                                <td className="pb-2 pr-2">
                                                    <Input type="number" min="0" step="0.01" value={l.credit} onChange={(e) => updateLine(l.key, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} />
                                                </td>
                                                <td className="pb-2 pr-2">
                                                    <Input value={l.note} maxLength={300} onChange={(e) => updateLine(l.key, { note: e.target.value })} />
                                                </td>
                                                <td className="pb-2">
                                                    <button
                                                        type="button"
                                                        disabled={lines.length <= 2}
                                                        onClick={() => setLines((c) => c.filter((x) => x.key !== l.key))}
                                                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"
                                                        aria-label="Remove line"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-slate-200 text-sm font-semibold">
                                            <td className="pt-2" colSpan={2}>
                                                <button type="button" onClick={() => setLines((c) => [...c, newLine()])} className="flex items-center gap-1 text-emerald-700 hover:underline">
                                                    <Plus className="h-4 w-4" /> Add line
                                                </button>
                                            </td>
                                            <td className="pt-2 pr-2 text-slate-900">{money(totalDebit)}</td>
                                            <td className="pt-2 pr-2 text-slate-900">{money(totalCredit)}</td>
                                            <td className="pt-2" colSpan={2}>
                                                {isBalanced ? (
                                                    <span className="text-emerald-700">✓ Balanced</span>
                                                ) : (
                                                    <span className="text-red-600">Difference {money(Math.abs(difference))}</span>
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <p className="text-xs text-slate-500">
                                Example — cash deposited to bank: <strong>Bank</strong> Debit 50,000 and <strong>Cash</strong> Credit 50,000.
                            </p>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeForm} disabled={createMutation.isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || !isBalanced}>
                                    {createMutation.isPending ? 'Saving...' : 'Save Voucher'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete Journal Voucher"
                description={`Delete ${deleteTarget?.entryNumber} (${deleteTarget ? money(deleteTarget.totalDebit) : ''})? Its ledger entries will be removed.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    )
}