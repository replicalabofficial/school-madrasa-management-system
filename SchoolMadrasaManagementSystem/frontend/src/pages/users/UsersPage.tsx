import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, KeyRound, Loader2, Pencil, Plus, Power, PowerOff, Trash2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { usersApi } from '../../api/usersApi'
import { branchesApi } from '../../api/branchesApi'
import type { ApiErrorPayload } from '../../api/client'
import type {
    AppUser,
    CreateUserRequest,
    UpdateUserRequest,
} from '../../types/user'

type AccountType = 'HeadOffice' | 'Branch'

interface UserFormValues {
    userName: string
    email: string
    fullName: string
    password: string
    accountType: AccountType
    branchId: number | ''
    isActive: boolean
}

const emptyForm: UserFormValues = {
    userName: '',
    email: '',
    fullName: '',
    password: '',
    accountType: 'Branch',
    branchId: '',
    isActive: true,
}

// Must match backend Identity rules: 8+ chars, at least one number and one lowercase letter
function getPasswordProblem(password: string): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.'
    return null
}

function getDisplayRole(allUsers: AppUser[], user: AppUser): string {
    if (user.role === 'HeadOfficeAdmin') {
        const headOfficeUsers = allUsers.filter((u) => u.role === 'HeadOfficeAdmin')
        const index = headOfficeUsers.findIndex((u) => u.id === user.id)
        return `Head Office User ${index + 1}`
    }
    return 'Branch User'
}

export function UsersPage() {
    const queryClient = useQueryClient()

    const [formOpen, setFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<AppUser | null>(null)
    const [formValues, setFormValues] = useState<UserFormValues>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [statusTarget, setStatusTarget] = useState<AppUser | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
    const [resetTarget, setResetTarget] = useState<AppUser | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [resetError, setResetError] = useState<string | null>(null)
    const [resetDone, setResetDone] = useState(false)

    const usersQuery = useQuery<AppUser[], ApiErrorPayload>({
        queryKey: ['users'],
        queryFn: usersApi.getAll,
    })

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: formOpen,
    })

    const createMutation = useMutation({
        mutationFn: usersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to create user.'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRequest }) =>
            usersApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to update user.'),
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            usersApi.setActiveStatus(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setStatusTarget(null)
        },
        onError: (err) => {
            alert((err as ApiErrorPayload).message ?? 'Failed to update user status.')
            setStatusTarget(null)
        },
    })

    const resetMutation = useMutation({
        mutationFn: ({ id, password }: { id: string; password: string }) =>
            usersApi.resetPassword(id, password),
        onSuccess: () => {
            setResetDone(true)
            setNewPassword('')
            setConfirmPassword('')
        },
        onError: (err) => setResetError((err as ApiErrorPayload).message ?? 'Failed to reset password.'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => usersApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setDeleteTarget(null)
        },
        onError: (err) => {
            alert((err as ApiErrorPayload).message ?? 'Failed to delete user.')
            setDeleteTarget(null)
        },
    })

    const isSubmitting = createMutation.isPending || updateMutation.isPending
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    function openCreateForm() {
        setEditingUser(null)
        setFormValues(emptyForm)
        setFormError(null)
        setFormOpen(true)
    }

    function openEditForm(user: AppUser) {
        setEditingUser(user)
        setFormValues({
            userName: user.userName,
            email: user.email,
            fullName: user.fullName,
            password: '',
            accountType: user.role === 'HeadOfficeAdmin' ? 'HeadOffice' : 'Branch',
            branchId: user.branchId ?? '',
            isActive: user.isActive,
        })
        setFormError(null)
        setFormOpen(true)
    }

    function openResetForm(user: AppUser) {
        setResetTarget(user)
        setNewPassword('')
        setConfirmPassword('')
        setResetError(null)
        setResetDone(false)
    }

    function closeResetForm() {
        setResetTarget(null)
        setNewPassword('')
        setConfirmPassword('')
        setResetError(null)
        setResetDone(false)
    }

    function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setResetError(null)
        if (!resetTarget) return

        const problem = getPasswordProblem(newPassword)
        if (problem) {
            setResetError(problem)
            return
        }
        if (newPassword !== confirmPassword) {
            setResetError('Passwords do not match.')
            return
        }
        resetMutation.mutate({ id: resetTarget.id, password: newPassword })
    }

    function closeForm() {
        setFormOpen(false)
        setEditingUser(null)
        setFormError(null)
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        if (!formValues.userName.trim() || !formValues.email.trim() || !formValues.fullName.trim()) {
            setFormError('Username, email and full name are required.')
            return
        }

        const isBranch = formValues.accountType === 'Branch'

        if (isBranch && !formValues.branchId) {
            setFormError('Branch is required.')
            return
        }

        const role = isBranch ? 'BranchUser' : 'HeadOfficeAdmin'
        const branchId = isBranch ? Number(formValues.branchId) : null

        if (editingUser) {
            const payload: UpdateUserRequest = {
                userName: formValues.userName.trim(),
                email: formValues.email.trim(),
                fullName: formValues.fullName.trim(),
                role,
                branchId,
                isActive: formValues.isActive,
            }
            updateMutation.mutate({ id: editingUser.id, payload })
        } else {
            const problem = getPasswordProblem(formValues.password)
            if (problem) {
                setFormError(problem)
                return
            }

            const payload: CreateUserRequest = {
                userName: formValues.userName.trim(),
                email: formValues.email.trim(),
                fullName: formValues.fullName.trim(),
                password: formValues.password,
                role,
                branchId,
            }
            createMutation.mutate(payload)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users & Permissions</h1>
                    <p className="mt-1 text-sm text-slate-500">Head Office: max 3 total. Each branch: max 1 user.</p>
                </div>
                <Button onClick={openCreateForm}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add User
                </Button>
            </div>

            {usersQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading users...</span>
                </div>
            )}

            {usersQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load users</p>
                        <p className="mt-1 text-sm text-red-600">{usersQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {usersQuery.data && (
                <Card className="overflow-hidden">
                    {usersQuery.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No users found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Name</th>
                                        <th className="px-5 py-3 font-medium">Username</th>
                                        <th className="px-5 py-3 font-medium">Role</th>
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersQuery.data.map((user) => (
                                        <tr key={user.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{user.fullName}</td>
                                            <td className="px-5 py-3 text-slate-600">{user.userName}</td>
                                            <td className="px-5 py-3 text-slate-600">
                                                {getDisplayRole(usersQuery.data!, user)}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{user.branchName ?? '—'}</td>
                                            <td className="px-5 py-3">
                                                <span className={user.isActive ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700' : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500'}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => openEditForm(user)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit user" title="Edit">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openResetForm(user)}
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                        aria-label="Reset password"
                                                        title="Reset password"
                                                    >
                                                        <KeyRound className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setStatusTarget(user)}
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                        aria-label={user.isActive ? 'Deactivate user' : 'Activate user'}
                                                        title={user.isActive ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {user.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(user)}
                                                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                        aria-label="Delete user"
                                                        title="Delete"
                                                    >
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
                            <h2 className="text-base font-semibold text-slate-900">
                                {editingUser ? 'Edit User' : 'Add User'}
                            </h2>
                            <button type="button" onClick={closeForm} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
                                <Input value={formValues.fullName} onChange={(e) => setFormValues((v) => ({ ...v, fullName: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
                                <Input value={formValues.userName} onChange={(e) => setFormValues((v) => ({ ...v, userName: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                                <Input type="email" value={formValues.email} onChange={(e) => setFormValues((v) => ({ ...v, email: e.target.value }))} required />
                            </div>

                            {!editingUser && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                                    <Input type="password" autoComplete="new-password" value={formValues.password} onChange={(e) => setFormValues((v) => ({ ...v, password: e.target.value }))} required />
                                    <p className="mt-1 text-xs text-slate-500">At least 8 characters, including a number and a lowercase letter.</p>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Account Type</label>
                                <select
                                    value={formValues.accountType}
                                    onChange={(e) =>
                                        setFormValues((v) => ({
                                            ...v,
                                            accountType: e.target.value as AccountType,
                                            branchId: e.target.value === 'HeadOffice' ? '' : v.branchId,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                >
                                    <option value="Branch">Branch User</option>
                                    <option value="HeadOffice">Head Office User</option>
                                </select>
                            </div>

                            {formValues.accountType === 'Branch' && (
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

                            {editingUser && (
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" checked={formValues.isActive} onChange={(e) => setFormValues((v) => ({ ...v, isActive: e.target.checked }))} />
                                    Active
                                </label>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeForm} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {resetTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Reset Password</h2>
                            <button type="button" onClick={closeResetForm} disabled={resetMutation.isPending} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {resetDone ? (
                            <div className="space-y-4 px-5 py-4">
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
                                    Password for "{resetTarget.fullName}" has been reset. They have been signed out and must log in with the new password.
                                </div>
                                <div className="flex justify-end">
                                    <Button type="button" onClick={closeResetForm}>Done</Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleResetSubmit} className="space-y-4 px-5 py-4">
                                <p className="text-sm text-slate-600">
                                    Set a new password for <span className="font-semibold text-slate-800">{resetTarget.fullName}</span> ({resetTarget.userName}).
                                </p>

                                {resetError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                        {resetError}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
                                    <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                                    <p className="mt-1 text-xs text-slate-500">At least 8 characters, including a number and a lowercase letter.</p>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm New Password</label>
                                    <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button type="button" variant="secondary" onClick={closeResetForm} disabled={resetMutation.isPending}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={resetMutation.isPending}>
                                        {resetMutation.isPending ? 'Saving...' : 'Reset Password'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={statusTarget !== null}
                title={statusTarget?.isActive ? 'Deactivate User' : 'Activate User'}
                description={`Are you sure you want to ${statusTarget?.isActive ? 'deactivate' : 'activate'} "${statusTarget?.fullName}"?`}
                confirmLabel={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
                variant={statusTarget?.isActive ? 'danger' : 'primary'}
                loading={statusMutation.isPending}
                onCancel={() => setStatusTarget(null)}
                onConfirm={() => {
                    if (statusTarget) {
                        statusMutation.mutate({ id: statusTarget.id, isActive: !statusTarget.isActive })
                    }
                }}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete User"
                description={`Are you sure you want to delete "${deleteTarget?.fullName}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    )
}