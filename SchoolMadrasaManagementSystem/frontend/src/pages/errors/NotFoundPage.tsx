import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Card } from '../../components/ui/Card'

export function NotFoundPage() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center">
            <Card className="w-full max-w-md p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <FileQuestion className="h-7 w-7 text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-semibold text-emerald-700">
                    404
                </p>

                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                    Page not found
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    The page you are looking for does not exist or may have been moved.
                </p>
                <Link
                    to="/"
                    className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    Back to Dashboard
                </Link>
            </Card>
        </div>
    )
}