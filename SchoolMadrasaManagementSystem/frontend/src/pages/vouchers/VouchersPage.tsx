import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Printer, Send } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { vouchersApi } from '../../api/vouchersApi'
import { settingsApi } from '../../api/settingsApi'
import { useAuthStore } from '../../stores/authStore'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { printHtml } from '../../utils/printHtml'
import type { Voucher } from '../../types/voucher'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

export function VouchersPage() {
    const queryClient = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const vouchersQuery = useQuery<Voucher[], ApiErrorPayload>({
        queryKey: ['vouchers'],
        queryFn: vouchersApi.getAll,
    })

    const settingsQuery = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.get,
        retry: false,
    })

    const sendMutation = useMutation({
        mutationFn: vouchersApi.sendToHeadOffice,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vouchers'] }),
    })

    function handlePrint(voucher: Voucher) {
        const logoHtml = settingsQuery.data?.logoPath
            ? `<img src="${API_ORIGIN}${settingsQuery.data.logoPath}" style="height:64px;width:64px;object-fit:contain;" />`
            : ''

        const html = `
            <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid #cbd5e1;padding-bottom:16px;">
                ${logoHtml}
                <div>
                    <h2>${settingsQuery.data?.institutionName ?? ''}</h2>
                    <p class="text-xs">${settingsQuery.data?.address ?? ''}</p>
                    <p class="text-xs">${settingsQuery.data?.phone ?? ''}</p>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:16px;">
                <h3>${voucher.voucherType === 'Expense' ? 'Payment Voucher' : 'Receipt Voucher'}</h3>
                <div class="text-right">
                    <p>Number: ${voucher.voucherNumber}</p>
                    <p>Date: ${new Date(voucher.voucherDate).toLocaleDateString()}</p>
                </div>
            </div>
            <p>Branch: ${voucher.branch?.name ?? '—'}</p>
            <p>Source A/c: CASH</p>
            <table>
                <thead><tr><th>Account</th><th>Description</th><th>Amount</th></tr></thead>
                <tbody>
                    <tr>
                        <td>${voucher.accountDescription}</td>
                        <td>${voucher.description}</td>
                        <td>${currencyFormatter.format(voucher.amount)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr><td colspan="2" class="text-right"><strong>Total</strong></td><td><strong>${currencyFormatter.format(voucher.amount)}</strong></td></tr>
                </tfoot>
            </table>
            <div class="signatures">
                <div>Prepared by</div>
                <div>Approved by</div>
                <div>Receiver's Sign.</div>
            </div>
        `

        printHtml(voucher.voucherNumber, html)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vouchers</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isHeadOffice
                        ? 'Vouchers received from all branches.'
                        : 'Vouchers generated from your income and expense entries.'}
                </p>
            </div>

            {vouchersQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading vouchers...</span>
                </div>
            )}

            {vouchersQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load vouchers</p>
                        <p className="mt-1 text-sm text-red-600">{vouchersQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {vouchersQuery.data && (
                <Card className="overflow-hidden">
                    {vouchersQuery.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No vouchers generated yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Voucher #</th>
                                        <th className="px-5 py-3 font-medium">Type</th>
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Account</th>
                                        <th className="px-5 py-3 font-medium">Amount</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Branch</th>}
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vouchersQuery.data.map((v) => (
                                        <tr key={v.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 font-medium text-slate-800">{v.voucherNumber}</td>
                                            <td className="px-5 py-3 text-slate-600">{v.voucherType}</td>
                                            <td className="px-5 py-3 text-slate-600">{new Date(v.voucherDate).toLocaleDateString()}</td>
                                            <td className="px-5 py-3 text-slate-600">{v.accountDescription}</td>
                                            <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(v.amount)}</td>
                                            {isHeadOffice && <td className="px-5 py-3 text-slate-600">{v.branch?.name ?? '—'}</td>}
                                            <td className="px-5 py-3 text-slate-600">
                                                {v.status === 'SentToHeadOffice'
                                                    ? `Sent ${v.sentAt ? new Date(v.sentAt).toLocaleString() : ''}`
                                                    : 'Draft'}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrint(v)}
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                        aria-label="Print voucher"
                                                        title="Print"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </button>
                                                    {!isHeadOffice && v.status === 'Draft' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => sendMutation.mutate(v.id)}
                                                            disabled={sendMutation.isPending}
                                                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                                                            aria-label="Send to Head Office"
                                                            title="Send to Head Office"
                                                        >
                                                            <Send className="h-4 w-4" />
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
        </div>
    )
}