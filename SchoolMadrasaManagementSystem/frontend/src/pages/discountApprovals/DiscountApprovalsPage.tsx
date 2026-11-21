import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { feesApi } from '../../api/feesApi'
import { studentsApi } from '../../api/studentsApi'
import type { Student } from '../../types/student'
import type { ApiErrorPayload } from '../../api/client'
import type { Fee } from '../../types/fee'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

export function DiscountApprovalsPage() {
    const queryClient = useQueryClient()

    const feesQuery = useQuery<Fee[], ApiErrorPayload>({
        queryKey: ['fees'],
        queryFn: feesApi.getAll,
    })

    const approveMutation = useMutation({
        mutationFn: (id: number) => feesApi.approveDiscount(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
    })

    const studentDiscountsQuery = useQuery<Student[], ApiErrorPayload>({
        queryKey: ['student-pending-discounts'],
        queryFn: studentsApi.pendingDiscounts,
    })

    const refreshStudents = () => {
        queryClient.invalidateQueries({ queryKey: ['student-pending-discounts'] })
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['fees'] })
    }

    const approveStudentMutation = useMutation({
        mutationFn: (id: number) => studentsApi.approveDiscount(id),
        onSuccess: refreshStudents,
    })

    const rejectStudentMutation = useMutation({
        mutationFn: (id: number) => studentsApi.rejectDiscount(id),
        onSuccess: refreshStudents,
    })

    const studentPending = studentDiscountsQuery.data ?? []

    const pending = useMemo(
        () => (feesQuery.data ?? []).filter((f) => f.discountApprovalStatus === 'PendingApproval'),
        [feesQuery.data],
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discount Approvals</h1>
                <p className="mt-1 text-sm text-slate-500">Fee discounts across all branches waiting for your approval.</p>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-3">
                    <p className="text-sm font-semibold text-slate-800">Monthly discounts (per student)</p>
                    <p className="text-xs text-slate-500">Once approved, the discount is applied automatically in every Monthly Fee Posting.</p>
                </div>
                {studentDiscountsQuery.isLoading ? (
                    <p className="p-5 text-sm text-slate-400">Loading...</p>
                ) : studentPending.length === 0 ? (
                    <p className="p-5 text-sm text-slate-400">No monthly discounts pending approval.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="px-5 py-3 font-medium">GR</th>
                                    <th className="px-5 py-3 font-medium">Student</th>
                                    <th className="px-5 py-3 font-medium">Class</th>
                                    <th className="px-5 py-3 font-medium">Branch</th>
                                    <th className="px-5 py-3 font-medium">Monthly fee</th>
                                    <th className="px-5 py-3 font-medium">Discount / month</th>
                                    <th className="px-5 py-3 font-medium">Pays</th>
                                    <th className="px-5 py-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentPending.map((s) => (
                                    <tr key={s.id} className="border-b border-slate-100">
                                        <td className="px-5 py-3 font-medium text-slate-800">{s.grNumber}</td>
                                        <td className="px-5 py-3 text-slate-600">{s.name}</td>
                                        <td className="px-5 py-3 text-slate-600">{s.class}</td>
                                        <td className="px-5 py-3 text-slate-600">{s.branch?.name ?? '—'}</td>
                                        <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(s.monthlyFee)}</td>
                                        <td className="px-5 py-3 font-medium text-amber-700">{currencyFormatter.format(s.monthlyDiscount)}</td>
                                        <td className="px-5 py-3 text-slate-800">{currencyFormatter.format(s.monthlyFee - s.monthlyDiscount)}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-2">
                                                <Button variant="secondary" onClick={() => approveStudentMutation.mutate(s.id)} disabled={approveStudentMutation.isPending}>
                                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                                    Approve
                                                </Button>
                                                <Button variant="ghost" onClick={() => rejectStudentMutation.mutate(s.id)} disabled={rejectStudentMutation.isPending}>
                                                    <XCircle className="mr-1.5 h-4 w-4" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <p className="pt-2 text-sm font-semibold text-slate-800">Discounts on individual fees</p>

            {feesQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading...</span>
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
                    {pending.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No discounts pending approval.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Serial #</th>
                                        <th className="px-5 py-3 font-medium">Student</th>
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Category</th>
                                        <th className="px-5 py-3 font-medium">Fee Amount</th>
                                        <th className="px-5 py-3 font-medium">Discount</th>
                                        <th className="px-5 py-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pending.map((fee) => (
                                        <tr key={fee.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{fee.serialNumber}</td>
                                            <td className="px-5 py-3 text-slate-600">{fee.student?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{fee.branch?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-slate-600">{fee.category}</td>
                                            <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(fee.amount)}</td>
                                            <td className="px-5 py-3 font-medium text-amber-700">{currencyFormatter.format(fee.discountAmount)}</td>
                                            <td className="px-5 py-3">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => approveMutation.mutate(fee.id)}
                                                    disabled={approveMutation.isPending}
                                                >
                                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                                    Approve
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}