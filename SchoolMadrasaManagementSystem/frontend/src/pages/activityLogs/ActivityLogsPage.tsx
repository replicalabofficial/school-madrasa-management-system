import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { activityLogsApi } from '../../api/activityLogsApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { ActivityLog } from '../../types/activityLog'

export function ActivityLogsPage() {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const logsQuery = useQuery<ActivityLog[], ApiErrorPayload>({
        queryKey: ['activity-logs'],
        queryFn: activityLogsApi.getAll,
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Logs</h1>
                <p className="mt-1 text-sm text-slate-500">Audit trail of actions across the system.</p>
            </div>

            {logsQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading activity logs...</span>
                </div>
            )}

            {logsQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load activity logs</p>
                        <p className="mt-1 text-sm text-red-600">{logsQuery.error.message}</p>
                    </div>
                </Card>
            )}

            {logsQuery.data && (
                <Card className="overflow-hidden">
                    {logsQuery.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No activity recorded yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">User</th>
                                        <th className="px-5 py-3 font-medium">Action</th>
                                        <th className="px-5 py-3 font-medium">Module</th>
                                        {isHeadOffice && <th className="px-5 py-3 font-medium">Branch</th>}
                                        <th className="px-5 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsQuery.data.map((log) => (
                                        <tr key={log.id} className="border-b border-slate-100">
                                            <td className="px-5 py-3 text-slate-600">
                                                {new Date(log.date).toLocaleDateString()} {log.time}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{log.userName}</td>
                                            <td className="px-5 py-3 text-slate-600">{log.action}</td>
                                            <td className="px-5 py-3 text-slate-600">{log.module}</td>
                                            {isHeadOffice && <td className="px-5 py-3 text-slate-600">{log.branchName || '—'}</td>}
                                            <td className="px-5 py-3">
                                                <span className={log.status === 'Success' ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700' : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700'}>
                                                    {log.status}
                                                </span>
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