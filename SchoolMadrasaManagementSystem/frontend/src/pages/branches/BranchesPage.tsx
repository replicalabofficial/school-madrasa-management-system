import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Pencil, Plus, Power, PowerOff, Trash2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { branchesApi } from '../../api/branchesApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { Branch } from '../../types/branch'

interface BranchFormValues {
    name: string
    code: string
    address: string
    isActive: boolean
}

const emptyForm: BranchFormValues = {
    name: '',
    code: '',
    address: '',
    isActive: true,
}

export function BranchesPage() {
    const queryClient = useQueryClient()
    const role = useAuthStore((state) => state.user?.role)
    const canManage = role === 'HeadOfficeAdmin'

    const [formOpen, setFormOpen] = useState(false)
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
    const [formValues, setFormValues] = useState<BranchFormValues>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [statusTarget, setStatusTarget] = useState<Branch | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)

    const branchesQuery = useQuery<Branch[], ApiErrorPayload>({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
    })

    const createMutation = useMutation({
        mutationFn: branchesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] })
            closeForm()
        },
        onError: (err) => {
            const apiError = err as ApiErrorPayload
            setFormError(apiError.message ?? 'Failed to create branch.')
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateBranchPayload }) =>
            branchesApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] })
            closeForm()
        },
        onError: (err) => {
            const apiError = err as ApiErrorPayload
            setFormError(apiError.message ?? 'Failed to update branch.')
        },
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
            branchesApi.setActiveStatus(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] })
            setStatusTarget(null)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => branchesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] })
            setDeleteTarget(null)
        },
        onError: (err) => {
            alert((err as ApiErrorPayload).message ?? 'Failed to delete branch.')
            setDeleteTarget(null)
        },
    })

    function openCreateForm() {
        setEditingBranch(null)
        setFormValues(emptyForm)
        setFormError(null)
        setFormOpen(true)
    }

    function openEditForm(branch: Branch) {
        setEditingBranch(branch)
        setFormValues({
            name: branch.name,
            code: branch.code,
            address: branch.address ?? '',
            isActive: branch.isActive,
        })
        setFormError(null)
        setFormOpen(true)
    }

    function closeForm() {
        setFormOpen(false)
        setEditingBranch(null)
        setFormError(null)
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        if (!formValues.name.trim() || !formValues.code.trim()) {
            setFormError('Name and code are required.')
            return
        }

        if (editingBranch) {
            updateMutation.mutate({
                id: editingBranch.id,
                payload: {
                    name: formValues.name.trim(),
                    code: formValues.code.trim(),
                    address: formValues.address.trim() || null,
                    isActive: formValues.isActive,
                },
            })
        } else {
            createMutation.mutate({
                name: formValues.name.trim(),
                code: formValues.code.trim(),
                address: formValues.address.trim() || null,
            })
        }
    }

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Branches
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage the branches in your institution.
                    </p>
                </div>

                {canManage && (
                    <Button onClick={openCreateForm}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add Branch
                    </Button>
                )}
            </div>

            {branchesQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading branches...</span>
                </div>
            )}

            {branchesQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">
                            Could not load branches
                        </p>
                        <p className="mt-1 text-sm text-red-600">
                            {branchesQuery.error.message}
                        </p>
                    </div>
                </Card>
            )}

            {branchesQuery.data && (
                <Card className="overflow-hidden">
                    {branchesQuery.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No branches found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Name</th>
                                        <th className="px-5 py-3 font-medium">Code</th>
                                        <th className="px-5 py-3 font-medium">Address</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        {canManage && (
                                            <th className="px-5 py-3 font-medium">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchesQuery.data.map((branch) => (
                                        <tr key={branch.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">
                                                {branch.name}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{branch.code}</td>
                                            <td className="px-5 py-3 text-slate-600">
                                                {branch.address ?? '-'}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span
                                                    className={
                                                        branch.isActive
                                                            ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                                                            : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500'
                                                    }
                                                >
                                                    {branch.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {canManage && (
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditForm(branch)}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                            aria-label="Edit branch"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setStatusTarget(branch)}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                            aria-label={
                                                                branch.isActive
                                                                    ? 'Deactivate branch'
                                                                    : 'Activate branch'
                                                            }
                                                            title={branch.isActive ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {branch.isActive ? (
                                                                <PowerOff className="h-4 w-4" />
                                                            ) : (
                                                                <Power className="h-4 w-4" />
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(branch)}
                                                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                            aria-label="Delete branch"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
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
                            <h2 className="text-base font-semibold text-slate-900">
                                {editingBranch ? 'Edit Branch' : 'Add Branch'}
                            </h2>

                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={isSubmitting}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Name
                                </label>
                                <Input
                                    value={formValues.name}
                                    onChange={(e) =>
                                        setFormValues((v) => ({ ...v, name: e.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Code
                                </label>
                                <Input
                                    value={formValues.code}
                                    onChange={(e) =>
                                        setFormValues((v) => ({ ...v, code: e.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Address (optional)
                                </label>
                                <Input
                                    value={formValues.address}
                                    onChange={(e) =>
                                        setFormValues((v) => ({ ...v, address: e.target.value }))
                                    }
                                />
                            </div>

                            {editingBranch && (
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={formValues.isActive}
                                        onChange={(e) =>
                                            setFormValues((v) => ({
                                                ...v,
                                                isActive: e.target.checked,
                                            }))
                                        }
                                    />
                                    Active
                                </label>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeForm}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting
                                        ? 'Saving...'
                                        : editingBranch
                                            ? 'Save Changes'
                                            : 'Create Branch'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={statusTarget !== null}
                title={statusTarget?.isActive ? 'Deactivate Branch' : 'Activate Branch'}
                description={`Are you sure you want to ${statusTarget?.isActive ? 'deactivate' : 'activate'
                    } "${statusTarget?.name}"?`}
                confirmLabel={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
                variant={statusTarget?.isActive ? 'danger' : 'primary'}
                loading={statusMutation.isPending}
                onCancel={() => setStatusTarget(null)}
                onConfirm={() => {
                    if (statusTarget) {
                        statusMutation.mutate({
                            id: statusTarget.id,
                            isActive: !statusTarget.isActive,
                        })
                    }
                }}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete Branch"
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

type UpdateBranchPayload = {
    name: string
    code: string
    address: string | null
    isActive: boolean
}