import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowUpCircle, BookOpen, FileUp, Loader2, LogOut, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { studentsApi } from '../../api/studentsApi'
import { branchesApi } from '../../api/branchesApi'
import { feeStructuresApi } from '../../api/feeSetupApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { Student, StudentPayload } from '../../types/student'
import { StudentImportModal } from './StudentImportModal'
import { ClassPromotionModal } from './ClassPromotionModal'

interface FormValues {
    name: string
    class: string
    branchId: number | ''
    grNumber: string
    fatherName: string
    fatherCnic: string
    parentPhone: string
    admissionDate: string
    monthlyFee: string
    monthlyDiscount: string
}

const emptyForm: FormValues = {
    name: '',
    class: '',
    branchId: '',
    grNumber: '',
    fatherName: '',
    fatherCnic: '',
    parentPhone: '',
    admissionDate: new Date().toISOString().slice(0, 10),
    monthlyFee: '',
    monthlyDiscount: '',
}

const money = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

export function StudentsPage() {
    const queryClient = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [search, setSearch] = useState('')
    const [branchFilter, setBranchFilter] = useState<number | ''>('')
    const [classFilter, setClassFilter] = useState('')
    const [setupHint, setSetupHint] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [editingStudent, setEditingStudent] = useState<Student | null>(null)
    const [formValues, setFormValues] = useState<FormValues>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
    const [leftTarget, setLeftTarget] = useState<Student | null>(null)
    const [importOpen, setImportOpen] = useState(false)
    const [promoteOpen, setPromoteOpen] = useState(false)

    const studentsQuery = useQuery<Student[], ApiErrorPayload>({
        queryKey: ['students'],
        queryFn: studentsApi.getAll,
    })

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: isHeadOffice,
    })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    const createMutation = useMutation({
        mutationFn: studentsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to create student.'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: StudentPayload }) => studentsApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to update student.'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => studentsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            setDeleteTarget(null)
        },
        onError: (err) => {
            alert((err as ApiErrorPayload).message ?? 'Failed to delete student.')
            setDeleteTarget(null)
        },
    })

    const markLeftMutation = useMutation({
        mutationFn: ({ id, leftDate }: { id: number; leftDate: string }) => studentsApi.markLeft(id, leftDate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            setLeftTarget(null)
        },
    })

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    function openCreateForm() {
        setEditingStudent(null)
        setFormValues({ ...emptyForm, branchId: isHeadOffice ? '' : (user?.branchId ?? '') })
        setFormError(null)
        setFormOpen(true)
    }

    function openEditForm(student: Student) {
        setEditingStudent(student)
        setFormValues({
            name: student.name,
            class: student.class,
            branchId: student.branchId,
            grNumber: student.grNumber,
            fatherName: student.fatherName ?? '',
            fatherCnic: student.fatherCnic ?? '',
            parentPhone: student.parentPhone ?? '',
            admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : '',
            monthlyFee: student.monthlyFee ? String(student.monthlyFee) : '',
            monthlyDiscount: student.monthlyDiscount ? String(student.monthlyDiscount) : '',
        })
        setFormError(null)
        setFormOpen(true)
    }

    function closeForm() {
        setFormOpen(false)
        setEditingStudent(null)
        setFormError(null)
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        const branchId = isHeadOffice ? formValues.branchId : user?.branchId

        if (!formValues.name.trim() || !formValues.class.trim() || !formValues.grNumber.trim() || !branchId) {
            setFormError('Please fill in all required fields.')
            return
        }

        const monthlyFee = Number(formValues.monthlyFee) || 0
        const monthlyDiscount = Number(formValues.monthlyDiscount) || 0
        if (monthlyDiscount > monthlyFee) {
            setFormError('Discount cannot be more than the monthly fee.')
            return
        }

        const payload: StudentPayload = {
            name: formValues.name.trim(),
            class: formValues.class.trim(),
            branchId: Number(branchId),
            grNumber: formValues.grNumber.trim(),
            fatherName: formValues.fatherName.trim() || null,
            fatherCnic: formValues.fatherCnic.trim() || null,
            parentPhone: formValues.parentPhone.trim() || null,
            admissionDate: formValues.admissionDate || null,
            monthlyFee,
            monthlyDiscount,
        }

        if (editingStudent) {
            updateMutation.mutate({ id: editingStudent.id, payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    // New admission: fill the monthly fee from Fee Setup when branch + class are known
    const formBranchId = isHeadOffice ? formValues.branchId : (user?.branchId ?? '')
    useEffect(() => {
        if (!formOpen || editingStudent || !formBranchId || !formValues.class.trim()) {
            setSetupHint(null)
            return
        }
        let cancelled = false
        const timer = setTimeout(async () => {
            try {
                const fs = await feeStructuresApi.lookup(Number(formBranchId), formValues.class.trim())
                if (cancelled) return
                if (fs) {
                    const fee = fs.newAdmissionMonthlyFee || fs.monthlyFee
                    setFormValues((v) => ({ ...v, monthlyFee: String(fee) }))
                    const once = [
                        fs.admissionFee ? `Admission ${money.format(fs.admissionFee)}` : '',
                        fs.formFee ? `Form ${money.format(fs.formFee)}` : '',
                        fs.stationeryFee ? `Stationery ${money.format(fs.stationeryFee)}` : '',
                    ].filter(Boolean)
                    setSetupHint(`Fee Setup ${fs.session}: new admission monthly fee Rs ${money.format(fee)}${once.length ? ' · One-time: ' + once.join(', ') : ''}`)
                } else {
                    setSetupHint('This class is not in Fee Setup yet — enter the monthly fee manually.')
                }
            } catch {
                if (!cancelled) setSetupHint(null)
            }
        }, 400)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [formOpen, editingStudent, formBranchId, formValues.class])

    // Branch-wise student counts (for the dropdown filter)
    const branchCounts = useMemo(() => {
        const counts = new Map<number, number>()
        for (const s of studentsQuery.data ?? []) {
            if (s.isActive) counts.set(s.branchId, (counts.get(s.branchId) ?? 0) + 1)
        }
        return counts
    }, [studentsQuery.data])

    const filtered = useMemo(() => {
        if (!studentsQuery.data) return []
        let rows = studentsQuery.data.filter((s) => s.isActive)

        if (branchFilter) {
            rows = rows.filter((s) => s.branchId === branchFilter)
        }

        if (classFilter) {
            rows = rows.filter((s) => s.class === classFilter)
        }

        const term = search.trim().toLowerCase()
        if (term) {
            rows = rows.filter(
                (s) =>
                    s.name.toLowerCase().includes(term) ||
                    s.grNumber.toLowerCase().includes(term) ||
                    (s.fatherName ?? '').toLowerCase().includes(term) ||
                    (s.parentPhone ?? '').includes(term) ||
                    (s.fatherCnic ?? '').includes(term),
            )
        }

        return [...rows].sort((a, b) => naturalSort(a.class, b.class) || a.name.localeCompare(b.name))
    }, [studentsQuery.data, search, branchFilter, classFilter])

    // Class-wise strength (active students, after the branch filter)
    const classCounts = useMemo(() => {
        const counts = new Map<string, number>()
        for (const s of studentsQuery.data ?? []) {
            if (!s.isActive) continue
            if (branchFilter && s.branchId !== branchFilter) continue
            counts.set(s.class, (counts.get(s.class) ?? 0) + 1)
        }
        return Array.from(counts.entries()).sort((a, b) => naturalSort(a[0], b[0]))
    }, [studentsQuery.data, branchFilter])

    const filteredFeeTotal = filtered.reduce((t, s) => t + s.monthlyFee, 0)
    const filteredDiscountTotal = filtered.reduce((t, s) => t + (s.discountStatus ? s.monthlyDiscount : 0), 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage student records.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setImportOpen(true)}>
                        <FileUp className="mr-1.5 h-4 w-4" />
                        Import
                    </Button>
                    <Button variant="secondary" onClick={() => setPromoteOpen(true)}>
                        <ArrowUpCircle className="mr-1.5 h-4 w-4" />
                        Promote Class
                    </Button>
                    <Button onClick={openCreateForm}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add Student
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, GR, father or phone..." className="pl-10" />
                </div>

                {isHeadOffice && (
                    <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : '')}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                        <option value="">All branches</option>
                        {activeBranches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name} ({branchCounts.get(b.id) ?? 0} students)
                            </option>
                        ))}
                    </select>
                )}

                <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                    <option value="">All classes</option>
                    {classCounts.map(([c, n]) => (
                        <option key={c} value={c}>
                            {c} ({n} students)
                        </option>
                    ))}
                </select>

                {studentsQuery.data && (
                    <span className="text-sm text-slate-500">
                        {filtered.length} students · Monthly fee Rs {money.format(filteredFeeTotal)}
                        {filteredDiscountTotal > 0 && ` · Discount Rs ${money.format(filteredDiscountTotal)}`}
                    </span>
                )}
            </div>

            {studentsQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading students...</span>
                </div>
            )}

            {studentsQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load students</p>
                        <p className="mt-1 text-sm text-red-600">{studentsQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {studentsQuery.data && (
                <Card className="overflow-hidden">
                    {filtered.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No students found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">GR Number</th>
                                        <th className="px-5 py-3 font-medium">Name</th>
                                        <th className="px-5 py-3 font-medium">Class</th>
                                        <th className="px-5 py-3 font-medium">Father / Phone</th>
                                        <th className="px-5 py-3 text-right font-medium">Monthly Fee</th>
                                        <th className="px-5 py-3 text-right font-medium">Discount</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Branch</th>}
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((student) => (
                                        <tr key={student.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{student.grNumber}</td>
                                            <td className="px-5 py-3 text-slate-600">{student.name}</td>
                                            <td className="px-5 py-3 text-slate-600">{student.class}</td>
                                            <td className="px-5 py-3 text-xs text-slate-600">
                                                {student.fatherName ?? '—'}
                                                {student.parentPhone && <div className="text-slate-400">{student.parentPhone}</div>}
                                            </td>
                                            <td className="px-5 py-3 text-right text-slate-700">
                                                {student.monthlyFee ? money.format(student.monthlyFee) : <span className="text-amber-600">not set</span>}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {student.monthlyDiscount > 0 ? (
                                                    <span className={student.discountStatus === 'Approved' ? 'text-amber-700' : 'text-slate-500'}>
                                                        {money.format(student.monthlyDiscount)}
                                                        {student.discountStatus === 'PendingApproval' && (
                                                            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">pending</span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            {isHeadOffice && <td className="px-5 py-3 text-slate-600">{student.branch?.name ?? '—'}</td>}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link to={`/fees/ledger/${student.id}`} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50" aria-label="Ledger" title="Fee ledger">
                                                        <BookOpen className="h-4 w-4" />
                                                    </Link>
                                                    <button type="button" onClick={() => openEditForm(student)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit" title="Edit">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setLeftTarget(student)} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50" aria-label="Mark left" title="Mark as Left">
                                                        <LogOut className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setDeleteTarget(student)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete" title="Delete">
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

            {formOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
                            <button type="button" onClick={closeForm} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">GR Number</label>
                                <Input value={formValues.grNumber} onChange={(e) => setFormValues((v) => ({ ...v, grNumber: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                                <Input value={formValues.name} onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
                                <Input value={formValues.class} onChange={(e) => setFormValues((v) => ({ ...v, class: e.target.value }))} required />
                            </div>

                            {isHeadOffice && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                                    <select
                                        value={formValues.branchId}
                                        onChange={(e) => setFormValues((v) => ({ ...v, branchId: e.target.value ? Number(e.target.value) : '' }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                        required
                                    >
                                        <option value="">Select a branch</option>
                                        {activeBranches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="border-t border-slate-100 pt-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Family & contact (siblings are matched by CNIC or phone)</p>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Father name</label>
                                        <Input value={formValues.fatherName} onChange={(e) => setFormValues((v) => ({ ...v, fatherName: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Father CNIC</label>
                                        <Input value={formValues.fatherCnic} onChange={(e) => setFormValues((v) => ({ ...v, fatherCnic: e.target.value }))} placeholder="42101-1234567-1" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Parent phone (WhatsApp)</label>
                                        <Input value={formValues.parentPhone} onChange={(e) => setFormValues((v) => ({ ...v, parentPhone: e.target.value }))} placeholder="03001234567" />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Fee</p>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Admission date</label>
                                        <Input type="date" value={formValues.admissionDate} onChange={(e) => setFormValues((v) => ({ ...v, admissionDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Monthly fee (Rs)</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={formValues.monthlyFee}
                                            onChange={(e) => setFormValues((v) => ({ ...v, monthlyFee: e.target.value }))}
                                            disabled={!isHeadOffice && !!editingStudent}
                                            title={!isHeadOffice && editingStudent ? 'Only Head Office can change a student’s monthly fee' : undefined}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Monthly discount (Rs)</label>
                                        <Input type="number" min={0} value={formValues.monthlyDiscount} onChange={(e) => setFormValues((v) => ({ ...v, monthlyDiscount: e.target.value }))} />
                                    </div>
                                </div>
                                {setupHint && <p className="mt-2 text-xs text-emerald-700">{setupHint}</p>}
                                <p className="mt-2 text-xs text-slate-500">
                                    {isHeadOffice
                                        ? 'A discount you enter is approved immediately and applies to every monthly posting.'
                                        : 'A new or changed discount goes to Head Office for approval, then applies to every monthly posting.'}
                                    {editingStudent?.discountStatus === 'PendingApproval' && ' Current discount is awaiting approval.'}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editingStudent ? 'Save Changes' : 'Create Student'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {importOpen && (
                <StudentImportModal
                    onClose={() => setImportOpen(false)}
                    onImported={() => queryClient.invalidateQueries({ queryKey: ['students'] })}
                />
            )}

            {promoteOpen && (
                <ClassPromotionModal
                    students={studentsQuery.data ?? []}
                    onClose={() => setPromoteOpen(false)}
                    onDone={() => queryClient.invalidateQueries({ queryKey: ['students'] })}
                />
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete Student"
                description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />

            {leftTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Mark Student as Left</h2>
                        </div>
                        <div className="space-y-3 px-5 py-4">
                            <p className="text-sm text-slate-600">{leftTarget.name} will be marked inactive and removed from active lists.</p>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                            <Button type="button" variant="secondary" onClick={() => setLeftTarget(null)}>Cancel</Button>
                            <Button
                                type="button"
                                onClick={() => markLeftMutation.mutate({ id: leftTarget.id, leftDate: new Date().toISOString().slice(0, 10) })}
                                disabled={markLeftMutation.isPending}
                            >
                                {markLeftMutation.isPending ? 'Saving...' : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}