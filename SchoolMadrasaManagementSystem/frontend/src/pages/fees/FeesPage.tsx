import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Layers, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { feesApi } from '../../api/feesApi'
import { studentsApi } from '../../api/studentsApi'
import type { ApiErrorPayload } from '../../api/client'
import { FEE_CATEGORIES, FEE_CATEGORY_CODE, type Fee, type FeePayload } from '../../types/fee'
import { BulkFeeModal } from './BulkFeeModal'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

function buildYearOptions(): number[] {
    const currentYear = new Date().getFullYear()
    return [currentYear - 1, currentYear, currentYear + 1]
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

function buildSerialNumber(grNumber: string, category: string, month: string, year: number): string {
    const monthAbbr = month.slice(0, 3).toUpperCase()
    const catCode = FEE_CATEGORY_CODE[category] ?? category.slice(0, 3).toUpperCase()
    return `${grNumber}-${catCode}-${monthAbbr}${year}`
}

interface CreateFormValues {
    studentId: number | ''
    selectedCategories: Record<string, string>
    feeMonth: string
    feeYear: number
    date: string
    description: string
    discountAmount: string
}

function makeEmptyCreateForm(): CreateFormValues {
    const now = new Date()
    return {
        studentId: '',
        selectedCategories: {},
        feeMonth: MONTHS[now.getMonth()],
        feeYear: now.getFullYear(),
        date: now.toISOString().slice(0, 10),
        description: '',
        discountAmount: '',
    }
}

interface EditFormValues {
    serialNumber: string
    studentId: number | ''
    category: string
    amount: string
    feeMonth: string
    feeYear: number
    date: string
    status: string
    notes: string
    description: string
    discountAmount: string
}

function parseFeePeriod(feePeriod: string): { month: string; year: number } {
    const parts = feePeriod.trim().split(' ')
    const year = Number(parts[parts.length - 1])
    const month = parts.slice(0, -1).join(' ')

    if (MONTHS.includes(month) && !Number.isNaN(year)) {
        return { month, year }
    }

    const now = new Date()
    return { month: MONTHS[now.getMonth()], year: now.getFullYear() }
}

export function FeesPage() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Paid'>('All')

    const [createOpen, setCreateOpen] = useState(false)
    const [createForm, setCreateForm] = useState<CreateFormValues>(makeEmptyCreateForm())
    const [createError, setCreateError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)

    const [editingFee, setEditingFee] = useState<Fee | null>(null)
    const [editForm, setEditForm] = useState<EditFormValues | null>(null)
    const [editError, setEditError] = useState<string | null>(null)

    const [deleteTarget, setDeleteTarget] = useState<Fee | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)

    const feesQuery = useQuery<Fee[], ApiErrorPayload>({
        queryKey: ['fees'],
        queryFn: feesApi.getAll,
    })

    const studentsQuery = useQuery({
        queryKey: ['students'],
        queryFn: studentsApi.getAll,
        enabled: createOpen || editingFee !== null,
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: FeePayload }) => feesApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fees'] })
            closeEditForm()
        },
        onError: (err) => setEditError((err as ApiErrorPayload).message ?? 'Failed to update fee.'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => feesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fees'] })
            setDeleteTarget(null)
        },
        onError: (err) => alert((err as ApiErrorPayload).message ?? 'Failed to delete fee.'),
    })

    function openCreateForm() {
        setCreateForm(makeEmptyCreateForm())
        setCreateError(null)
        setCreateOpen(true)
    }

    function closeCreateForm() {
        setCreateOpen(false)
        setCreateError(null)
    }

    function toggleCategory(category: string, checked: boolean) {
        setCreateForm((f) => {
            const next = { ...f.selectedCategories }
            if (checked) {
                next[category] = next[category] ?? ''
            } else {
                delete next[category]
            }
            return { ...f, selectedCategories: next }
        })
    }

    const selectedCategoryCount = Object.keys(createForm.selectedCategories).length

    async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setCreateError(null)

        const categories = Object.entries(createForm.selectedCategories)
        const selectedStudent = (studentsQuery.data ?? []).find((s) => s.id === createForm.studentId)

        if (!createForm.studentId || !selectedStudent || categories.length === 0) {
            setCreateError('Please select a student and at least one fee category.')
            return
        }

        for (const [cat, amt] of categories) {
            if (!amt || Number(amt) <= 0) {
                setCreateError(`Please enter a valid amount for ${cat}.`)
                return
            }
        }

        if (createForm.discountAmount && categories.length > 1) {
            setCreateError('Discount can only be applied when a single fee category is selected.')
            return
        }

        setCreating(true)

        try {
            for (const [cat, amt] of categories) {
                const payload: FeePayload = {
                    serialNumber: buildSerialNumber(selectedStudent.grNumber, cat, createForm.feeMonth, createForm.feeYear),
                    studentId: Number(createForm.studentId),
                    category: cat,
                    amount: Number(amt),
                    feePeriod: `${createForm.feeMonth} ${createForm.feeYear}`,
                    date: createForm.date,
                    status: 'Pending',
                    description: createForm.description.trim() || null,
                    discountAmount: createForm.discountAmount ? Number(createForm.discountAmount) : 0,
                }
                await feesApi.create(payload)
            }

            queryClient.invalidateQueries({ queryKey: ['fees'] })
            closeCreateForm()
        } catch (err) {
            setCreateError((err as ApiErrorPayload).message ?? 'Failed to create fee(s). Some entries may have been created.')
            queryClient.invalidateQueries({ queryKey: ['fees'] })
        } finally {
            setCreating(false)
        }
    }

    function openEditForm(fee: Fee) {
        const { month, year } = parseFeePeriod(fee.feePeriod)
        setEditingFee(fee)
        setEditForm({
            serialNumber: fee.serialNumber,
            studentId: fee.studentId,
            category: fee.category,
            amount: String(fee.amount),
            feeMonth: month,
            feeYear: year,
            date: fee.date.slice(0, 10),
            status: fee.status,
            notes: fee.notes ?? '',
            description: fee.description ?? '',
            discountAmount: fee.discountAmount ? String(fee.discountAmount) : '',
        })
        setEditError(null)
    }

    function closeEditForm() {
        setEditingFee(null)
        setEditForm(null)
        setEditError(null)
    }

    function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setEditError(null)

        if (!editingFee || !editForm) return

        if (!editForm.studentId || !editForm.category.trim() || !editForm.amount) {
            setEditError('Please fill in all required fields.')
            return
        }

        const payload: FeePayload = {
            serialNumber: editForm.serialNumber,
            studentId: Number(editForm.studentId),
            category: editForm.category.trim(),
            amount: Number(editForm.amount),
            feePeriod: `${editForm.feeMonth} ${editForm.feeYear}`,
            date: editForm.date,
            status: editForm.status,
            notes: editForm.notes.trim() || null,
            description: editForm.description.trim() || null,
            discountAmount: editForm.discountAmount ? Number(editForm.discountAmount) : 0,
        }

        updateMutation.mutate({ id: editingFee.id, payload })
    }

    const filtered = useMemo(() => {
        if (!feesQuery.data) return []
        let rows = feesQuery.data

        if (statusFilter !== 'All') {
            rows = rows.filter((f) => f.status === statusFilter)
        }

        const term = search.trim().toLowerCase()
        if (term) {
            rows = rows.filter(
                (f) =>
                    f.serialNumber.toLowerCase().includes(term) ||
                    (f.student?.name ?? '').toLowerCase().includes(term) ||
                    (f.student?.grNumber ?? '').toLowerCase().includes(term),
            )
        }

        return rows
    }, [feesQuery.data, search, statusFilter])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fees</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage student fee records.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setBulkOpen(true)}>
                        <Layers className="mr-1.5 h-4 w-4" />
                        Generate for Class
                    </Button>
                    <Button onClick={openCreateForm}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add Fee
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by serial, student or GR number..." className="pl-10" />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Pending' | 'Paid')}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                    <option value="All">All statuses</option>
                    <option value="Pending">Due / Pending only</option>
                    <option value="Paid">Paid only</option>
                </select>
            </div>

            {feesQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading fees...</span>
                </div>
            )}

            {feesQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load fees</p>
                        <p className="mt-1 text-sm text-red-600">{feesQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {feesQuery.data && (
                <Card className="overflow-hidden">
                    {filtered.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">
                            {feesQuery.data.length === 0 ? 'No fees found.' : 'No fees match your filters.'}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Serial #</th>
                                        <th className="px-5 py-3 font-medium">GR #</th>
                                        <th className="px-5 py-3 font-medium">Student</th>
                                        <th className="px-5 py-3 font-medium">Category</th>
                                        <th className="px-5 py-3 font-medium">Amount</th>
                                        <th className="px-5 py-3 font-medium">Period</th>
                                        <th className="px-5 py-3 font-medium">Discount</th>
                                        <th className="px-5 py-3 font-medium">Fees Detail</th>
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((fee) => (
                                        <tr key={fee.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{fee.serialNumber}</td>
                                            <td className="px-5 py-3 text-slate-600">{fee.student?.grNumber ?? '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{fee.student?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{fee.category}</td>
                                            <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(fee.amount)}</td>
                                            <td className="px-5 py-3 text-slate-600">{fee.feePeriod}</td>
                                            <td className="px-5 py-3">
                                                {fee.discountAmount > 0 ? (
                                                    <span
                                                        className={
                                                            fee.discountApprovalStatus === 'Approved'
                                                                ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                                                                : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700'
                                                        }
                                                    >
                                                        {currencyFormatter.format(fee.discountAmount)}
                                                        {fee.discountApprovalStatus === 'PendingApproval' ? ' — Waiting for HO Approval' : ''}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/fees/student/${fee.studentId}`)}
                                                    className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
                                                >
                                                    Fees Detail
                                                </button>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => openEditForm(fee)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit fee" title="Edit">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setDeleteTarget(fee)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete fee" title="Delete">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {createOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Add Fee</h2>
                            <button type="button" onClick={closeCreateForm} disabled={creating} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
                            {createError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{createError}</div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Student</label>
                                <select
                                    value={createForm.studentId}
                                    onChange={(e) => setCreateForm((v) => ({ ...v, studentId: e.target.value ? Number(e.target.value) : '' }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select a student</option>
                                    {(studentsQuery.data ?? []).map((s) => (
                                        <option key={s.id} value={s.id}>{s.grNumber} — {s.name} ({s.class})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee Categories</label>
                                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                                    {FEE_CATEGORIES.map((cat) => {
                                        const checked = cat in createForm.selectedCategories
                                        return (
                                            <div key={cat} className="flex items-center gap-3">
                                                <label className="flex w-40 items-center gap-2 text-sm text-slate-700">
                                                    <input type="checkbox" checked={checked} onChange={(e) => toggleCategory(cat, e.target.checked)} />
                                                    {cat}
                                                </label>
                                                {checked && (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="Amount"
                                                        value={createForm.selectedCategories[cat]}
                                                        onChange={(e) =>
                                                            setCreateForm((v) => ({
                                                                ...v,
                                                                selectedCategories: { ...v.selectedCategories, [cat]: e.target.value },
                                                            }))
                                                        }
                                                        className="flex-1"
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Month</label>
                                    <select
                                        value={createForm.feeMonth}
                                        onChange={(e) => setCreateForm((v) => ({ ...v, feeMonth: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    >
                                        {MONTHS.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Year</label>
                                    <select
                                        value={createForm.feeYear}
                                        onChange={(e) => setCreateForm((v) => ({ ...v, feeYear: Number(e.target.value) }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    >
                                        {buildYearOptions().map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                                <Input type="date" value={createForm.date} onChange={(e) => setCreateForm((v) => ({ ...v, date: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description (optional)</label>
                                <Input value={createForm.description} onChange={(e) => setCreateForm((v) => ({ ...v, description: e.target.value }))} />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Discount Amount (optional)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={createForm.discountAmount}
                                    onChange={(e) => setCreateForm((v) => ({ ...v, discountAmount: e.target.value }))}
                                    disabled={selectedCategoryCount > 1}
                                    placeholder={selectedCategoryCount > 1 ? 'Only available for a single category' : 'In rupees, not percentage'}
                                />
                                <p className="mt-1 text-xs text-slate-400">A discount requires Head Office approval before the fee can be marked paid.</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeCreateForm} disabled={creating}>Cancel</Button>
                                <Button type="submit" disabled={creating}>{creating ? 'Saving...' : 'Create Fee'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingFee && editForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Edit Fee</h2>
                            <button type="button" onClick={closeEditForm} disabled={updateMutation.isPending} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
                            {editError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{editError}</div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Serial Number</label>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{editForm.serialNumber}</div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Student</label>
                                <select
                                    value={editForm.studentId}
                                    onChange={(e) => setEditForm((v) => v && { ...v, studentId: e.target.value ? Number(e.target.value) : '' })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select a student</option>
                                    {(studentsQuery.data ?? []).map((s) => (
                                        <option key={s.id} value={s.id}>{s.grNumber} — {s.name} ({s.class})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                                <select
                                    value={editForm.category}
                                    onChange={(e) => setEditForm((v) => v && { ...v, category: e.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    {FEE_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
                                <Input type="number" min="0" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((v) => v && { ...v, amount: e.target.value })} required />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Month</label>
                                    <select
                                        value={editForm.feeMonth}
                                        onChange={(e) => setEditForm((v) => v && { ...v, feeMonth: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    >
                                        {MONTHS.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Year</label>
                                    <select
                                        value={editForm.feeYear}
                                        onChange={(e) => setEditForm((v) => v && { ...v, feeYear: Number(e.target.value) })}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    >
                                        {buildYearOptions().map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                                <Input type="date" value={editForm.date} onChange={(e) => setEditForm((v) => v && { ...v, date: e.target.value })} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description (optional)</label>
                                <Input value={editForm.description} onChange={(e) => setEditForm((v) => v && { ...v, description: e.target.value })} />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Discount Amount (optional)</label>
                                <Input type="number" min="0" step="0.01" value={editForm.discountAmount} onChange={(e) => setEditForm((v) => v && { ...v, discountAmount: e.target.value })} />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes (optional)</label>
                                <Input value={editForm.notes} onChange={(e) => setEditForm((v) => v && { ...v, notes: e.target.value })} />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeEditForm} disabled={updateMutation.isPending}>Cancel</Button>
                                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {bulkOpen && (
                <BulkFeeModal
                    existingFees={feesQuery.data ?? []}
                    onClose={() => setBulkOpen(false)}
                    onDone={() => queryClient.invalidateQueries({ queryKey: ['fees'] })}
                />
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete Fee"
                description={`Are you sure you want to delete fee "${deleteTarget?.serialNumber}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    )
}