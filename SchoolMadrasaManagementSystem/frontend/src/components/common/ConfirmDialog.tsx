import { AlertTriangle, X } from 'lucide-react'
import { Button } from '../ui/Button'

interface ConfirmDialogProps {
    open: boolean
    title?: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'primary' | 'danger'
    loading?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    open,
    title = 'Confirm Action',
    description = 'Are you sure you want to continue?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) {
        return null
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
        >
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>

                        <div>
                            <h2
                                id="confirm-dialog-title"
                                className="text-base font-semibold text-slate-900"
                            >
                                {title}
                            </h2>

                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                {description}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>

                    <Button
                        type="button"
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}