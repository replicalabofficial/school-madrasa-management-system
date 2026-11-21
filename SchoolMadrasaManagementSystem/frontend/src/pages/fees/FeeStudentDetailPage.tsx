import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, FileText, Loader2, Printer, Receipt, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { UnauthorizedPage } from '../errors/UnauthorizedPage'
import { feesApi } from '../../api/feesApi'
import { brandingApi } from '../../api/brandingApi'
import { useAuthStore } from '../../stores/authStore'
import { approvedDiscount, netAmount, printFeeReceipt, printFeeSlip } from '../../utils/feeReceipt'
import { MessageButtons } from '../../components/common/MessageButtons'
import { duesMessage, receiptMessage } from '../../utils/parentMessage'
import type { ApiErrorPayload } from '../../api/client'
import type { Fee } from '../../types/fee'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
const money = (value: number) => currencyFormatter.format(value)

const isDiscountWaiting = (fee: Fee) => fee.discountAmount > 0 && fee.discountApprovalStatus !== 'Approved'

export function FeeStudentDetailPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const user = useAuthStore((state) => state.user)
    const role = user?.role
    const enabledModules = user?.enabledModules
    const isAllowed = role === 'HeadOfficeAdmin' || (enabledModules ?? []).includes('Fees')

    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [confirmPay, setConfirmPay] = useState(false)
    const [confirmUnpay, setConfirmUnpay] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [justPaid, setJustPaid] = useState<Fee[] | null>(null)

    const feesQuery = useQuery<Fee[], ApiErrorPayload>({
        queryKey: ['fees'],
        queryFn: feesApi.getAll,
    })

    const brandingQuery = useQuery({ queryKey: ['branding'], queryFn: brandingApi.get })

    const numericStudentId = Number(studentId)

    const studentFees = useMemo(() => {
        if (!feesQuery.data) return []
        return feesQuery.data
            .filter((f) => f.studentId === numericStudentId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [feesQuery.data, numericStudentId])

    if (!isAllowed) {
        return <UnauthorizedPage />
    }

    const printOptions = {
        institutionName: brandingQuery.data?.institutionName,
        logoPath: brandingQuery.data?.logoPath,
        receivedBy:
            (user as { fullName?: string; userName?: string } | null)?.fullName ??
            (user as { fullName?: string; userName?: string } | null)?.userName,
    }

    const unpaidFees = studentFees.filter((f) => f.status !== 'Paid')
    const totalDue = unpaidFees.reduce((s, f) => s + netAmount(f), 0)
    const student = studentFees[0]?.student

    const selectedFees = studentFees.filter((f) => selected.has(f.id))
    const selectedUnpaid = selectedFees.filter((f) => f.status !== 'Paid')
    const selectedPaid = selectedFees.filter((f) => f.status === 'Paid')
    const selectedTotal = selectedUnpaid.reduce((s, f) => s + netAmount(f), 0)
    const blockedByDiscount = selectedUnpaid.filter(isDiscountWaiting)

    function refresh() {
        queryClient.invalidateQueries({ queryKey: ['fees'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }

    function toggle(id: number) {
        setSelected((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
        setActionError(null)
    }

    function selectAllDue() {
        setSelected(new Set(unpaidFees.filter((f) => !isDiscountWaiting(f)).map((f) => f.id)))
        setActionError(null)
    }

    // Mark every selected unpaid fee as paid, then offer ONE receipt for all of them
    async function receivePayment() {
        setBusy(true)
        setActionError(null)
        const paid: Fee[] = []
        const now = new Date().toISOString()

        try {
            for (const fee of selectedUnpaid) {
                await feesApi.markPaid(fee.id)
                paid.push({ ...fee, status: 'Paid', paidDate: now })
            }
        } catch (err) {
            setActionError(
                `${paid.length} of ${selectedUnpaid.length} fees were marked paid. Stopped at an error: ${(err as ApiErrorPayload).message ?? 'failed'}`,
            )
        } finally {
            setBusy(false)
            setConfirmPay(false)
            setSelected(new Set())
            if (paid.length > 0) setJustPaid(paid)
            refresh()
        }
    }

    async function reversePayment() {
        setBusy(true)
        setActionError(null)
        try {
            for (const fee of selectedPaid) {
                await feesApi.markPending(fee.id)
            }
        } catch (err) {
            setActionError((err as ApiErrorPayload).message ?? 'Failed to mark as unpaid.')
        } finally {
            setBusy(false)
            setConfirmUnpay(false)
            setSelected(new Set())
            refresh()
        }
    }

    return (
        <div className="space-y-6">
            <button
                type="button"
                onClick={() => navigate('/fees')}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Fees
            </button>

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fees Detail — {student?.name ?? 'Student'}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {student ? `GR ${student.grNumber} · Class ${student.class} · ` : ''}Tick the fees the student is paying, then click Receive Payment.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right">
                    <p className="text-xs text-slate-500">Total due</p>
                    <p className={`text-xl font-bold ${totalDue > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{money(totalDue)}</p>
                </div>
            </div>

            {justPaid && (
                <Card className="flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-2 text-sm text-emerald-800">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            {justPaid.length} fee{justPaid.length > 1 ? 's' : ''} marked as paid —{' '}
                            <strong>{money(justPaid.reduce((s, f) => s + netAmount(f), 0))}</strong> received in cash
                            {justPaid.length > 1 ? ` (${justPaid.map((f) => f.category).join(' + ')})` : ''}.
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => printFeeReceipt(justPaid, printOptions)}>
                            <Printer className="mr-1.5 h-4 w-4" />
                            Print Receipt
                        </Button>
                        {student && (
                            <MessageButtons
                                phone={student.parentPhone}
                                text={receiptMessage(
                                    { name: student.name, grNumber: student.grNumber },
                                    justPaid.map((f) => `${f.category} ${f.feePeriod}`),
                                    justPaid.reduce((s, f) => s + netAmount(f), 0),
                                    justPaid.length === 1
                                        ? justPaid[0].serialNumber
                                        : `RCPT-${student.grNumber}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
                                    brandingQuery.data?.institutionName,
                                )}
                            />
                        )}
                        <Button variant="secondary" onClick={() => setJustPaid(null)}>
                            Close
                        </Button>
                    </div>
                </Card>
            )}

            {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{actionError}</div>
            )}

            <Card className="flex flex-wrap items-center gap-2 p-3">
                <Button variant="secondary" onClick={selectAllDue} disabled={unpaidFees.length === 0 || busy}>
                    Select all due
                </Button>

                <Button
                    onClick={() => {
                        setActionError(null)
                        setConfirmPay(true)
                    }}
                    disabled={selectedUnpaid.length === 0 || blockedByDiscount.length > 0 || busy}
                >
                    <Receipt className="mr-1.5 h-4 w-4" />
                    Receive Payment{selectedUnpaid.length > 0 ? ` (${selectedUnpaid.length} · ${money(selectedTotal)})` : ''}
                </Button>

                <Button
                    variant="secondary"
                    onClick={() => printFeeSlip(selectedUnpaid.length > 0 ? selectedUnpaid : unpaidFees, printOptions)}
                    disabled={unpaidFees.length === 0}
                >
                    <FileText className="mr-1.5 h-4 w-4" />
                    {unpaidFees.length === 0
                        ? 'Due Slip (nothing due)'
                        : selectedUnpaid.length > 0
                            ? `Print Due Slip (${selectedUnpaid.length} selected)`
                            : `Print Due Slip (all · ${money(totalDue)})`}
                </Button>

                {student && totalDue > 0 && (
                    <MessageButtons
                        phone={student.parentPhone}
                        text={duesMessage(
                            { name: student.name, grNumber: student.grNumber },
                            totalDue,
                            unpaidFees.map((f) => f.feePeriod),
                            brandingQuery.data?.institutionName,
                        )}
                    />
                )}

                <Link to={`/fees/ledger/${numericStudentId}`}>
                    <Button variant="ghost">
                        <BookOpen className="mr-1.5 h-4 w-4" />
                        Ledger
                    </Button>
                </Link>

                {selectedPaid.length > 0 && (
                    <>
                        <Button variant="secondary" onClick={() => printFeeReceipt(selectedPaid, printOptions)} disabled={busy}>
                            <Printer className="mr-1.5 h-4 w-4" />
                            Print Receipt ({selectedPaid.length})
                        </Button>
                        <Button variant="secondary" onClick={() => setConfirmUnpay(true)} disabled={busy}>
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Mark Unpaid ({selectedPaid.length})
                        </Button>
                    </>
                )}

                {blockedByDiscount.length > 0 && (
                    <span className="text-xs text-amber-700">A selected fee has a discount waiting for Head Office approval.</span>
                )}
            </Card>

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
                    {studentFees.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No fee records found for this student.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="w-10 px-4 py-3" />
                                        <th className="px-4 py-3 font-medium">Serial #</th>
                                        <th className="px-4 py-3 font-medium">Category</th>
                                        <th className="px-4 py-3 font-medium">Period</th>
                                        <th className="px-4 py-3 font-medium">Amount</th>
                                        <th className="px-4 py-3 font-medium">Discount</th>
                                        <th className="px-4 py-3 font-medium">Payable</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentFees.map((fee) => {
                                        const isPaid = fee.status === 'Paid'
                                        const waiting = isDiscountWaiting(fee)
                                        const discount = fee.discountAmount > 0 ? fee.discountAmount : 0

                                        return (
                                            <tr key={fee.id} className={`border-b border-slate-100 ${selected.has(fee.id) ? 'bg-emerald-50/60' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <input type="checkbox" checked={selected.has(fee.id)} onChange={() => toggle(fee.id)} disabled={busy} />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800">{fee.serialNumber}</td>
                                                <td className="px-4 py-3 text-slate-600">{fee.category}</td>
                                                <td className="px-4 py-3 text-slate-600">{fee.feePeriod}</td>
                                                <td className="px-4 py-3 text-slate-600">{money(fee.amount)}</td>
                                                <td className="px-4 py-3">
                                                    {discount > 0 ? (
                                                        <span className={waiting ? 'text-xs font-medium text-amber-700' : 'text-slate-600'}>
                                                            {money(discount)}
                                                            {waiting ? ' (waiting)' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {money(fee.amount - approvedDiscount(fee))}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isPaid ? (
                                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                            Paid{fee.paidDate ? ` · ${new Date(fee.paidDate).toLocaleDateString()}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Due</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isPaid ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => printFeeReceipt([fee], printOptions)}
                                                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                            Receipt
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {confirmPay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Receive Payment</h2>
                        </div>
                        <div className="space-y-3 px-5 py-4 text-sm">
                            <p className="text-slate-600">These fees will be marked as paid in Cash:</p>
                            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                {selectedUnpaid.map((f) => (
                                    <div key={f.id} className="flex justify-between px-3 py-2">
                                        <span className="text-slate-700">{f.category} · {f.feePeriod}</span>
                                        <span className="font-medium text-slate-900">{money(netAmount(f))}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between bg-slate-50 px-3 py-2 font-semibold">
                                    <span>Total</span>
                                    <span>{money(selectedTotal)}</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">One receipt will be printed for all of them.</p>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                            <Button type="button" variant="secondary" onClick={() => setConfirmPay(false)} disabled={busy}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={receivePayment} disabled={busy}>
                                {busy ? 'Saving...' : `Confirm ${money(selectedTotal)}`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {confirmUnpay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Mark as Unpaid</h2>
                        </div>
                        <div className="px-5 py-4 text-sm text-slate-600">
                            Reverse the payment of {selectedPaid.length} fee{selectedPaid.length > 1 ? 's' : ''}? The cash entry will be removed.
                            Branch users can only reverse today's payments.
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                            <Button type="button" variant="secondary" onClick={() => setConfirmUnpay(false)} disabled={busy}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={reversePayment} disabled={busy}>
                                {busy ? 'Saving...' : 'Mark Unpaid'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}