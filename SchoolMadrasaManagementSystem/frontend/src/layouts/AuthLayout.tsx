import type { ReactNode } from 'react'

interface AuthLayoutProps {
    children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

            <div className="grid min-h-screen lg:grid-cols-2">
                <div className="hidden bg-emerald-900 lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-12">
                    <div>
                        <div className="text-2xl font-extrabold tracking-tight text-white xl:text-3xl">
                            EFAS
                        </div>

                        <p className="mt-1 text-sm text-emerald-200">
                            Education & Finance Administration System
                        </p>
                    </div>

                    <div className="max-w-lg">
                        <p className="text-sm font-medium uppercase tracking-wider text-emerald-200">
                            Management Portal
                        </p>

                        <h1 className="mt-4 text-3xl font-bold leading-tight text-white xl:text-4xl">
                            Manage Everything in One Place.
                        </h1>

                        <p className="mt-5 text-sm leading-7 text-emerald-100 xl:text-base">
                            A single platform that connects every branch of your institution
                             students, staff, fees, and complete accounting  all tracked
                            accurately, in one place.
                        </p>
                    </div>

                    <p className="text-xs text-emerald-200">
                        EFAS Education & Finance Administration System
                    </p>
                </div>

                <div className="flex min-h-screen items-center justify-center overflow-y-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-10 xl:px-12">
                    <div className="w-full max-w-md">
                        <div className="mb-6 text-center sm:mb-8 sm:text-left lg:hidden">
                            <div className="text-xl font-extrabold text-emerald-800 sm:text-2xl">
                                EFAS
                            </div>

                            <p className="text-xs text-slate-500 sm:text-sm">
                                Education & Finance Administration System
                            </p>
                        </div>

                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}