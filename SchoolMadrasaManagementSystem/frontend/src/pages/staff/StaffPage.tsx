import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { staffApi } from '../../api/staffApi'
import { branchesApi } from '../../api/branchesApi'
import { useAuthStore } from '../../stores/authStore'
import { STAFF_DESIGNATIONS } from '../../types/staff'
import type { ApiErrorPayload } from '../../api/client'
import type { Staff, StaffPayload } from '../../types/staff'

interface FormValues {
    name: string
    branchId: number | ''
    designation: string
}

const emptyForm: FormValues = { name: '', branchId: '', designation: 'Teacher' }

export function StaffPage() {
    const queryClient = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [search, setSearch] = useState('')
    const [branchFilter, setBranchFilter] = useState<number | ''>('')
    const [formOpen, setFormOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
    const [formValues, setFormValues] = useState<FormValues>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

    const staffQuery = useQuery<Staff[], ApiErrorPayload>({
        queryKey: ['staff'],
        queryFn: staffApi.getAll,
    })

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: isHeadOffice,
    })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    const createMutation = useMutation({
        mutationFn: staffApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to create staff.'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: StaffPayload }) => staffApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to update staff.'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => staffApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            setDeleteTarget(null)
        },
    })

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    function openCreateForm() {
        setEditingStaff(null)
        setFormValues({ ...emptyForm, branchId: isHeadOffice ? '' : (user?.branchId ?? '') })
        setFormError(null)
        setFormOpen(true)
    }

    function openEditForm(staff: Staff) {
        setEditingStaff(staff)
        setFormValues({ name: staff.name, branchId: staff.branchId, designation: staff.designation })
        setFormError(null)
        setFormOpen(true)
    }

    function closeForm() {
        setFormOpen(false)
        setEditingStaff(null)
        setFormError(null)
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        const branchId = isHeadOffice ? formValues.branchId : user?.branchId

        if (!formValues.name.trim() || !branchId) {
            setFormError('Please fill in all required fields.')
            return
        }

        const payload: StaffPayload = {
            name: formValues.name.trim(),
            branchId: Number(branchId),
            designation: formValues.designation,
        }

        if (editingStaff) {
            updateMutation.mutate({ id: editingStaff.id, payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    const branchCounts = useMemo(() => {
        const counts = new Map<number, number>()
        for (const s of staffQuery.data ?? []) {
            counts.set(s.branchId, (counts.get(s.branchId) ?? 0) + 1)
        }
        return counts
    }, [staffQuery.data])

    const filtered = useMemo(() => {
        if (!staffQuery.data) return []
        let rows = staffQuery.data

        if (branchFilter) {
            rows = rows.filter((s) => s.branchId === branchFilter)
        }

        const term = search.trim().toLowerCase()
        if (term) {
            rows = rows.filter((s) => s.name.toLowerCase().includes(term))
        }

        return rows
    }, [staffQuery.data, search, branchFilter])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage staff records.</p>
                </div>
                <Button onClick={openCreateForm}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Staff
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="pl-10" />
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
                                {b.name} ({branchCounts.get(b.id) ?? 0} staff)
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {staffQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading staff...</span>
                </div>
            )}

            {staffQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load staff</p>
                        <p className="mt-1 text-sm text-red-600">{staffQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {staffQuery.data && (
                <Card className="overflow-hidden">
                    {filtered.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No staff found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Name</th>
                                        <th className="px-5 py-3 font-medium">Designation</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Branch</th>}
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((staff) => (
                                        <tr key={staff.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{staff.name}</td>
                                            <td className="px-5 py-3 text-slate-600">{staff.designation}</td>
                                            {isHeadOffice && <td className="px-5 py-3 text-slate-600">{staff.branch?.name ?? '—'}</td>}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => openEditForm(staff)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit" title="Edit">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setDeleteTarget(staff)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete" title="Delete">
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
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">{editingStaff ? 'Edit Staff' : 'Add Staff'}</h2>
                            <button type="button" onClick={closeForm} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                                <Input value={formValues.name} onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Designation</label>
                                <select
                                    value={formValues.designation}
                                    onChange={(e) => setFormValues((v) => ({ ...v, designation: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                >
                                    {STAFF_DESIGNATIONS.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
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

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete Staff"
                description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    )
}