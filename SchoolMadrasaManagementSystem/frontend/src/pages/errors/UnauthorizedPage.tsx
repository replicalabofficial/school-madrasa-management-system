import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Card } from '../../components/ui/Card'

export function UnauthorizedPage() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center">
            <Card className="w-full max-w-md p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                    <ShieldAlert className="h-7 w-7 text-amber-600" />
                </div>

                <p className="mt-5 text-sm font-semibold text-amber-600">
                    Access Restricted
                </p>

                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                    Unauthorized
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    You do not have permission to access this page.
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