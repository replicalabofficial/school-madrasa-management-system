import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

interface ErrorStateProps {
    title?: string
    description?: string
    onRetry?: () => void
}

export function ErrorState({
    title = 'Something went wrong',
    description = 'We could not load this information. Please try again.',
    onRetry,
}: ErrorStateProps) {
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-red-100 bg-white px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-6 w-6 text-red-600" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
                {description}
            </p>

            {onRetry && (
                <Button
                    type="button"
                    variant="secondary"
                    className="mt-4 gap-2"
                    onClick={onRetry}
                >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </Button>
            )}
        </div>
    )
}