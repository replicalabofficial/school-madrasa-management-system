import { LoaderCircle } from 'lucide-react'

interface LoadingScreenProps {
    message?: string
}

export function LoadingScreen({
    message = 'Loading...',
}: LoadingScreenProps) {
    return (
        <div className="flex min-h-[240px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
                <LoaderCircle className="h-7 w-7 animate-spin text-emerald-700" />
                <p className="text-sm">{message}</p>
            </div>
        </div>
    )
}