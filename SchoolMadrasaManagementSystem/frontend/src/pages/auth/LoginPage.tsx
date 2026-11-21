import { useState, type FormEvent } from 'react'
import { Hash, LockKeyhole, Mail } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/authStore'

export function LoginPage() {
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [branchCode, setBranchCode] = useState('')

    const login = useAuthStore((state) => state.login)
    const isSubmitting = useAuthStore((state) => state.isSubmitting)
    const error = useAuthStore((state) => state.error)
    const clearError = useAuthStore((state) => state.clearError)

    const navigate = useNavigate()
    const location = useLocation()

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        clearError()

        const success = await login({ userName, password, branchCode: branchCode.trim() || undefined })

        if (success) {
            const redirectTo =
                (location.state as { from?: string } | null)?.from ?? '/'
            navigate(redirectTo, { replace: true })
        }
    }

    return (
        <>
            <Card className="p-6 sm:p-8">
                <div className="mb-8">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                        <LockKeyhole className="h-5 w-5 text-emerald-700" />
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Welcome back
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Sign in to access the management portal.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="userName"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Username or email
                        </label>

                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                id="userName"
                                type="text"
                                value={userName}
                                onChange={(event) => setUserName(event.target.value)}
                                placeholder="Enter your username or email"
                                autoComplete="username"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>

                        <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="branchCode"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Branch code <span className="font-normal text-slate-400">(leave blank for Head Office)</span>
                        </label>

                        <div className="relative">
                            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                id="branchCode"
                                type="text"
                                value={branchCode}
                                onChange={(event) => setBranchCode(event.target.value)}
                                placeholder="e.g. 003"
                                autoComplete="off"
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>
            </Card>

            <p className="mt-6 text-center text-xs text-slate-400">
                Secure management portal
            </p>
        </>
    )
}