import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, DollarSign, History, Loader2, Pencil, Plus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { salariesApi } from '../../api/salariesApi'
import { staffApi } from '../../api/staffApi'
import { chartOfAccountsApi } from '../../api/chartOfAccountsApi'
import type { ApiErrorPayload } from '../../api/client'
import type { Salary, SalaryPayload, SalaryPaymentPayload, SalaryAdjustment, SalaryAdjustmentPayload } from '../../types/salary'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

function formatSalaryMonth(salaryMonth: string): string {
    const d = new Date(`${salaryMonth.slice(0, 7)}-01`)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface FormValues {
    staffId: number | ''
    salaryMonth: string
    basicSalary: string
    allowances: string
    deductions: string
    notes: string
}

const emptyForm: FormValues = {
    staffId: '',
    salaryMonth: new Date().toISOString().slice(0, 7),
    basicSalary: '',
    allowances: '0',
    deductions: '0',
    notes: '',
}

export function SalariesPage() {
    const queryClient = useQueryClient()

    const [formOpen, setFormOpen] = useState(false)
    const [editingSalary, setEditingSalary] = useState<Salary | null>(null)
    const [formValues, setFormValues] = useState<FormValues>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)

    const [paymentTarget, setPaymentTarget] = useState<Salary | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
    const [paymentChartOfAccountId, setPaymentChartOfAccountId] = useState<number | ''>('')
    const [paymentSourceAccountId, setPaymentSourceAccountId] = useState<number | ''>('')
    const [paymentError, setPaymentError] = useState<string | null>(null)

    const [historyStaff, setHistoryStaff] = useState<{ id: number; name: string } | null>(null)

    // Additional Salary (one-off adjustment)
    const [additionalOpen, setAdditionalOpen] = useState(false)
    const [addStaffId, setAddStaffId] = useState<number | ''>('')
    const [addAmount, setAddAmount] = useState('')
    const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10))
    const [addReason, setAddReason] = useState('')
    const [addChartOfAccountId, setAddChartOfAccountId] = useState<number | ''>('')
    const [addSourceAccountId, setAddSourceAccountId] = useState<number | ''>('')
    const [additionalError, setAdditionalError] = useState<string | null>(null)

    const salariesQuery = useQuery<Salary[], ApiErrorPayload>({
        queryKey: ['salaries'],
        queryFn: salariesApi.getAll,
    })

    const staffQuery = useQuery({
        queryKey: ['staff'],
        queryFn: staffApi.getAll,
        enabled: formOpen || additionalOpen,
    })

    const accountsQuery = useQuery({
        queryKey: ['chart-of-accounts'],
        queryFn: chartOfAccountsApi.getAll,
        enabled: paymentTarget !== null || additionalOpen,
    })
    const expenseAccounts = (accountsQuery.data ?? []).filter((a) => a.isActive && a.accountType === 'Expenses')
    const cashAccounts = (accountsQuery.data ?? []).filter((a) => a.isActive && a.accountType === 'Cash')

    const additionalQuery = useQuery<SalaryAdjustment[]>({
        queryKey: ['salary-adjustments'],
        queryFn: salariesApi.getAdditional,
    })

    const createMutation = useMutation({
        mutationFn: salariesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaries'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to create salary.'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: SalaryPayload }) => salariesApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaries'] })
            closeForm()
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to update salary.'),
    })

    const paymentMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: SalaryPaymentPayload }) => salariesApi.makePayment(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaries'] })
            setPaymentTarget(null)
            setPaymentAmount('')
            setPaymentChartOfAccountId('')
            setPaymentSourceAccountId('')
        },
        onError: (err) => setPaymentError((err as ApiErrorPayload).message ?? 'Failed to record payment.'),
    })

    const additionalMutation = useMutation({
        mutationFn: (payload: SalaryAdjustmentPayload) => salariesApi.createAdditional(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-adjustments'] })
            setAdditionalOpen(false)
            setAddStaffId('')
            setAddAmount('')
            setAddReason('')
            setAddChartOfAccountId('')
            setAddSourceAccountId('')
        },
        onError: (err) => setAdditionalError((err as ApiErrorPayload).message ?? 'Failed to record additional salary.'),
    })

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    function openCreateForm() {
        setEditingSalary(null)
        setFormValues(emptyForm)
        setFormError(null)
        setFormOpen(true)
    }

    function openEditForm(salary: Salary) {
        setEditingSalary(salary)
        setFormValues({
            staffId: salary.staffId,
            salaryMonth: salary.salaryMonth,
            basicSalary: String(salary.basicSalary),
            allowances: String(salary.allowances),
            deductions: String(salary.deductions),
            notes: salary.notes ?? '',
        })
        setFormError(null)
        setFormOpen(true)
    }

    function closeForm() {
        setFormOpen(false)
        setEditingSalary(null)
        setFormError(null)
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        if (!formValues.staffId || !formValues.salaryMonth || !formValues.basicSalary) {
            setFormError('Staff, salary month and basic salary are required.')
            return
        }

        const payload: SalaryPayload = {
            staffId: Number(formValues.staffId),
            salaryMonth: `${formValues.salaryMonth}-01`,
            basicSalary: Number(formValues.basicSalary),
            allowances: Number(formValues.allowances || 0),
            deductions: Number(formValues.deductions || 0),
            notes: formValues.notes.trim() || null,
        }

        if (editingSalary) {
            updateMutation.mutate({ id: editingSalary.id, payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPaymentError(null)

        if (!paymentTarget || !paymentAmount || !paymentChartOfAccountId || !paymentSourceAccountId) {
            setPaymentError('Please fill in all fields.')
            return
        }

        paymentMutation.mutate({
            id: paymentTarget.id,
            payload: {
                paymentAmount: Number(paymentAmount),
                paymentDate,
                chartOfAccountId: Number(paymentChartOfAccountId),
                sourceAccountId: Number(paymentSourceAccountId),
            },
        })
    }

    function handleAdditionalSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setAdditionalError(null)

        if (!addStaffId || !addAmount || !addReason.trim() || !addChartOfAccountId || !addSourceAccountId) {
            setAdditionalError('Please fill in all fields.')
            return
        }

        additionalMutation.mutate({
            staffId: Number(addStaffId),
            amount: Number(addAmount),
            date: addDate,
            reason: addReason.trim(),
            chartOfAccountId: Number(addChartOfAccountId),
            sourceAccountId: Number(addSourceAccountId),
        })
    }

    // Har staff ka sirf sabse latest month wala record list mein dikhayein
    const latestPerStaff = useMemo(() => {
        if (!salariesQuery.data) return []

        const map = new Map<number, Salary>()
        for (const s of salariesQuery.data) {
            const existing = map.get(s.staffId)
            if (!existing || s.salaryMonth > existing.salaryMonth) {
                map.set(s.staffId, s)
            }
        }

        return Array.from(map.values()).sort((a, b) =>
            (a.staff?.name ?? '').localeCompare(b.staff?.name ?? ''),
        )
    }, [salariesQuery.data])

    const historyRows = useMemo(() => {
        if (!historyStaff || !salariesQuery.data) return []
        return salariesQuery.data
            .filter((s) => s.staffId === historyStaff.id)
            .sort((a, b) => b.salaryMonth.localeCompare(a.salaryMonth))
    }, [historyStaff, salariesQuery.data])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Salary Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Showing latest record per staff member. View history for past months.</p>
                </div>
                <Button onClick={openCreateForm}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Salary
                </Button>
            </div>

            {salariesQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading salaries...</span>
                </div>
            )}

            {salariesQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load salaries</p>
                        <p className="mt-1 text-sm text-red-600">{salariesQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {salariesQuery.data && (
                <Card className="overflow-hidden">
                    {latestPerStaff.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No salary records found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Staff</th>
                                        <th className="px-5 py-3 font-medium">Latest Month</th>
                                        <th className="px-5 py-3 font-medium">Net Salary</th>
                                        <th className="px-5 py-3 font-medium">Paid</th>
                                        <th className="px-5 py-3 font-medium">Remaining</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {latestPerStaff.map((salary) => (
                                        <tr key={salary.staffId} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{salary.staff?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{formatSalaryMonth(salary.salaryMonth)}</td>
                                            <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(salary.netSalary)}</td>
                                            <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(salary.paidAmount)}</td>
                                            <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(salary.remainingAmount)}</td>
                                            <td className="px-5 py-3 text-slate-600">{salary.status}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setHistoryStaff({
                                                                id: salary.staffId,
                                                                name: salary.staff?.name ?? 'Staff',
                                                            })
                                                        }
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                        aria-label="View history"
                                                        title="View Salary History"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </button>
                                                    {salary.paidAmount === 0 && (
                                                        <button type="button" onClick={() => openEditForm(salary)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit salary" title="Edit">
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {salary.status !== 'Paid' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPaymentTarget(salary)
                                                                setPaymentError(null)
                                                                setPaymentChartOfAccountId('')
                                                                setPaymentSourceAccountId('')
                                                            }}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                            aria-label="Record payment"
                                                            title="Record payment"
                                                        >
                                                            <DollarSign className="h-4 w-4" />
                                                        </button>
                                                    )}
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

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Additional Salary Payments</h2>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setAdditionalOpen(true)
                            setAdditionalError(null)
                        }}
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add Additional Salary
                    </Button>
                </div>

                {(additionalQuery.data ?? []).length === 0 ? (
                    <p className="p-6 text-sm text-slate-400">No additional/one-off salary payments recorded.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="px-5 py-3 font-medium">Staff</th>
                                    <th className="px-5 py-3 font-medium">Date</th>
                                    <th className="px-5 py-3 font-medium">Amount</th>
                                    <th className="px-5 py-3 font-medium">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(additionalQuery.data ?? []).map((adj) => (
                                    <tr key={adj.id} className="border-b border-slate-100">
                                        <td className="px-5 py-3 font-medium text-slate-800">{adj.staff?.name ?? '—'}</td>
                                        <td className="px-5 py-3 text-slate-600">{new Date(adj.date).toLocaleDateString()}</td>
                                        <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(adj.amount)}</td>
                                        <td className="px-5 py-3 text-slate-600">{adj.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {formOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">
                                {editingSalary ? 'Edit Salary' : 'Add Salary'}
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
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Staff</label>
                                <select
                                    value={formValues.staffId}
                                    onChange={(e) => setFormValues((v) => ({ ...v, staffId: e.target.value ? Number(e.target.value) : '' }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select staff</option>
                                    {(staffQuery.data ?? []).map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Salary Month</label>
                                <Input type="month" value={formValues.salaryMonth} onChange={(e) => setFormValues((v) => ({ ...v, salaryMonth: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Basic Salary</label>
                                <Input type="number" min="0" step="0.01" value={formValues.basicSalary} onChange={(e) => setFormValues((v) => ({ ...v, basicSalary: e.target.value }))} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Allowances</label>
                                <Input type="number" min="0" step="0.01" value={formValues.allowances} onChange={(e) => setFormValues((v) => ({ ...v, allowances: e.target.value }))} />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Deductions</label>
                                <Input type="number" min="0" step="0.01" value={formValues.deductions} onChange={(e) => setFormValues((v) => ({ ...v, deductions: e.target.value }))} />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes (optional)</label>
                                <Input value={formValues.notes} onChange={(e) => setFormValues((v) => ({ ...v, notes: e.target.value }))} />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={closeForm} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : editingSalary ? 'Save Changes' : 'Create Salary'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {paymentTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Record Payment</h2>
                            <button type="button" onClick={() => setPaymentTarget(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4 px-5 py-4">
                            {paymentError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    {paymentError}
                                </div>
                            )}

                            <p className="text-sm text-slate-500">
                                Remaining: {currencyFormatter.format(paymentTarget.remainingAmount)}
                            </p>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Amount</label>
                                <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Date</label>
                                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Expense Account</label>
                                <select
                                    value={paymentChartOfAccountId}
                                    onChange={(e) => setPaymentChartOfAccountId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select expense account</option>
                                    {expenseAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>{a.accountDescription}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Cash / Bank Account</label>
                                <select
                                    value={paymentSourceAccountId}
                                    onChange={(e) => setPaymentSourceAccountId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select Cash or Bank</option>
                                    {cashAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>{a.accountDescription}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setPaymentTarget(null)} disabled={paymentMutation.isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={paymentMutation.isPending}>
                                    {paymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {additionalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Additional Salary Payment</h2>
                            <button type="button" onClick={() => setAdditionalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAdditionalSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                            {additionalError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{additionalError}</div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Staff</label>
                                <select
                                    value={addStaffId}
                                    onChange={(e) => setAddStaffId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select staff</option>
                                    {(staffQuery.data ?? []).map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
                                <Input type="number" min="0" step="0.01" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                                <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason</label>
                                <Input value={addReason} onChange={(e) => setAddReason(e.target.value)} placeholder="e.g. Advance payment, bonus, correction" required />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Expense Account</label>
                                <select
                                    value={addChartOfAccountId}
                                    onChange={(e) => setAddChartOfAccountId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select expense account</option>
                                    {expenseAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>{a.accountDescription}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Cash / Bank Account</label>
                                <select
                                    value={addSourceAccountId}
                                    onChange={(e) => setAddSourceAccountId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                    required
                                >
                                    <option value="">Select Cash or Bank</option>
                                    {cashAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>{a.accountDescription}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setAdditionalOpen(false)} disabled={additionalMutation.isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={additionalMutation.isPending}>
                                    {additionalMutation.isPending ? 'Saving...' : 'Record Payment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {historyStaff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">
                                Salary History — {historyStaff.name}
                            </h2>
                            <button type="button" onClick={() => setHistoryStaff(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5">
                            {historyRows.length === 0 ? (
                                <p className="text-sm text-slate-400">No salary records found for this staff member.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="py-2 pr-3 font-medium">Month</th>
                                            <th className="py-2 pr-3 font-medium">Net</th>
                                            <th className="py-2 pr-3 font-medium">Paid</th>
                                            <th className="py-2 pr-3 font-medium">Remaining</th>
                                            <th className="py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyRows.map((row) => (
                                            <tr key={row.id} className="border-b border-slate-100">
                                                <td className="py-2 pr-3 text-slate-600">{formatSalaryMonth(row.salaryMonth)}</td>
                                                <td className="py-2 pr-3 font-medium text-slate-900">{currencyFormatter.format(row.netSalary)}</td>
                                                <td className="py-2 pr-3 text-slate-600">{currencyFormatter.format(row.paidAmount)}</td>
                                                <td className="py-2 pr-3 text-slate-600">{currencyFormatter.format(row.remainingAmount)}</td>
                                                <td className="py-2 text-slate-600">{row.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}