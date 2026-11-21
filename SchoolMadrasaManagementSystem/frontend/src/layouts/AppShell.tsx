import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar
                open={sidebarOpen}
                collapsed={sidebarCollapsed}
                onClose={() => setSidebarOpen(false)}
                onToggle={() => setSidebarCollapsed((value) => !value)}
            />

            <Header
                onMenuClick={() => setSidebarOpen(true)}
                sidebarCollapsed={sidebarCollapsed}
            />

            <main
                className={`min-h-screen pt-16 transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
                    }`}
            >
                <div className="p-4 sm:p-6">
                    {import.meta.env.VITE_DEMO === 'true' && (
                        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                            <b>DEMO</b> — Ye EFAS ka demo version hai. Yahan ka saara data 30 November ko saaf kar diya jayega.
                        </div>
                    )}
                    <Outlet />
                </div>
            </main>
        </div>
    )
}