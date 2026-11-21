import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { feeCategoryAccountMappingApi } from '../../api/feeCategoryAccountMappingApi'
import { chartOfAccountsApi } from '../../api/chartOfAccountsApi'
import { branchesApi } from '../../api/branchesApi'
import { FEE_CATEGORIES } from '../../types/fee'
import type { ApiErrorPayload } from '../../api/client'
import type { FeeCategoryAccountMapping } from '../../types/feeCategoryAccountMapping'

export function FeeCategoryAccountsPage() {
    const queryClient = useQueryClient()

    const [category, setCategory] = useState(FEE_CATEGORIES[0])
    const [branchId, setBranchId] = useState<number | ''>('')
    const [chartOfAccountId, setChartOfAccountId] = useState<number | ''>('')
    const [formError, setFormError] = useState<string | null>(null)

    const mappingsQuery = useQuery<FeeCategoryAccountMapping[], ApiErrorPayload>({
        queryKey: ['fee-category-accounts'],
        queryFn: feeCategoryAccountMappingApi.getAll,
    })

    const accountsQuery = useQuery({
        queryKey: ['chart-of-accounts'],
        queryFn: chartOfAccountsApi.getAll,
    })
    const incomeAccounts = (accountsQuery.data ?? []).filter((a) => a.isActive && a.accountType === 'Income')

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
    })
    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    const upsertMutation = useMutation({
        mutationFn: feeCategoryAccountMappingApi.upsert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-category-accounts'] })
            setChartOfAccountId('')
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to save.'),
    })

    function handleSave() {
        setFormError(null)
        if (!chartOfAccountId) {
            setFormError('Please select an income account.')
            return
        }
        upsertMutation.mutate({ category, branchId: branchId || null, chartOfAccountId: Number(chartOfAccountId) })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Category Accounts</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Set which income account each fee category posts to. Once configured, fees post automatically — no manual selection needed.
                </p>
            </div>

            <Card className="space-y-4 p-5">
                {formError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                            {FEE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                            <option value="">All branches</option>
                            {activeBranches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Income Account</label>
                        <select
                            value={chartOfAccountId}
                            onChange={(e) => setChartOfAccountId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                            <option value="">Select account</option>
                            {incomeAccounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.accountDescription}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={upsertMutation.isPending}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {upsertMutation.isPending ? 'Saving...' : 'Save Mapping'}
                </Button>
            </Card>

            {mappingsQuery.isLoading && (
                <div className="flex min-h-[20vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {mappingsQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-600">{mappingsQuery.error.message}</p>
                </Card>
            )}

            {mappingsQuery.data && (
                <Card className="overflow-hidden">
                    {mappingsQuery.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No mappings configured yet. Fees won't post to income until set up here.</p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="px-5 py-3 font-medium">Category</th>
                                    <th className="px-5 py-3 font-medium">Branch</th>
                                    <th className="px-5 py-3 font-medium">Income Account</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappingsQuery.data.map((m) => (
                                    <tr key={m.id} className="border-b border-slate-100">
                                        <td className="px-5 py-3 font-medium text-slate-800">{m.category}</td>
                                        <td className="px-5 py-3 text-slate-600">{m.branch?.name ?? 'All branches'}</td>
                                        <td className="px-5 py-3 text-slate-600">{m.chartOfAccount?.accountDescription ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            )}
        </div>
    )
}