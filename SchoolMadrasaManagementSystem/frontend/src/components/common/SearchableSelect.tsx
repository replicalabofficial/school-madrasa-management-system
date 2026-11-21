import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

interface Option {
    value: number
    label: string
}

interface Props {
    options: Option[]
    value: number | ''
    onChange: (value: number | '') => void
    placeholder?: string
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search...' }: Props) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return options
        return options.filter((o) => o.label.toLowerCase().includes(term))
    }, [options, search])

    const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-left text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
                <span className={selectedLabel ? 'text-slate-900' : 'text-slate-400'}>{selectedLabel || 'Select an account'}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
                    <div className="absolute z-[91] mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                        <div className="relative border-b border-slate-100 p-2">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={placeholder}
                                className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2 text-sm focus:outline-none"
                            />
                        </div>
                        <div className="max-h-56 overflow-y-auto py-1">
                            {filtered.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-slate-400">No matches.</p>
                            ) : (
                                filtered.map((o) => (
                                    <button
                                        key={o.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(o.value)
                                            setOpen(false)
                                            setSearch('')
                                        }}
                                        className={
                                            o.value === value
                                                ? 'block w-full px-3 py-2 text-left text-sm bg-emerald-50 text-emerald-700'
                                                : 'block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50'
                                        }
                                    >
                                        {o.label}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}