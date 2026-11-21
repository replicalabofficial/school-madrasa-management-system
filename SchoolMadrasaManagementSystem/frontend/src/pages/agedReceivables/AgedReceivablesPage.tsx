import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { agingReportApi } from '../../api/agingReportApi'
import type { ApiErrorPayload } from '../../api/client'
import type { AgedReceivableRow } from '../../types/agingReport'

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

const BUCKETS = ['0-30 days', '31-60 days', '61-90 days', '90+ days']

export function AgedReceivablesPage() {
    const query = useQuery<AgedReceivableRow[], ApiErrorPayload>({
        queryKey: ['aged-receivables'],
        queryFn: agingReportApi.getAgedReceivables,
    })

    const bucketTotals = useMemo(() => {
        const totals: Record<string, number> = {}
        BUCKETS.forEach((b) => (totals[b] = 0))
        for (const row of query.data ?? []) {
            totals[row.agingBucket] = (totals[row.agingBucket] ?? 0) + row.amount
        }
        return totals
    }, [query.data])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Aged Receivables</h1>
                <p className="mt-1 text-sm text-slate-500">Outstanding (unpaid) fees, grouped by how long they've been due.</p>
            </div>

            {query.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading...</span>
                </div>
            )}

            {query.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load report</p>
                        <p className="mt-1 text-sm text-red-600">{query.error.message}</p>
                    </div>
                </Card>
            )}

            {query.data && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {BUCKETS.map((bucket) => (
                            <Card key={bucket} className="p-5">
                                <p className="text-sm text-slate-500">{bucket}</p>
                                <p className="mt-2 text-xl font-bold text-slate-900">{currencyFormatter.format(bucketTotals[bucket] ?? 0)}</p>
                            </Card>
                        ))}
                    </div>

                    <Card className="overflow-hidden">
                        {query.data.length === 0 ? (
                            <p className="p-6 text-sm text-slate-400">No outstanding fees.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="px-5 py-3 font-medium">Serial #</th>
                                            <th className="px-5 py-3 font-medium">Student</th>
                                            <th className="px-5 py-3 font-medium">Branch</th>
                                            <th className="px-5 py-3 font-medium">Period</th>
                                            <th className="px-5 py-3 font-medium">Amount</th>
                                            <th className="px-5 py-3 font-medium">Days Outstanding</th>
                                            <th className="px-5 py-3 font-medium">Bucket</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {query.data.map((row) => (
                                            <tr key={row.feeId} className="border-b border-slate-100">
                                                <td className="px-5 py-3 font-medium text-slate-800">{row.serialNumber}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.studentName}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.branchName}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.feePeriod}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.amount)}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.daysOutstanding}</td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={
                                                            row.agingBucket === '90+ days'
                                                                ? 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700'
                                                                : row.agingBucket === '61-90 days'
                                                                    ? 'rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700'
                                                                    : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700'
                                                        }
                                                    >
                                                        {row.agingBucket}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    )
}