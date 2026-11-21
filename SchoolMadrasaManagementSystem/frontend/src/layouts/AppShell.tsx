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
                    <Outlet />
                </div>
            </main>
        </div>
    )
}