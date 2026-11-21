import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
    title: string
    description?: string
    action?: ReactNode
}

export function EmptyState({
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Inbox className="h-6 w-6 text-slate-500" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {title}
            </h3>

            {description && (
                <p className="mt-1 max-w-md text-sm text-slate-500">
                    {description}
                </p>
            )}

            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}