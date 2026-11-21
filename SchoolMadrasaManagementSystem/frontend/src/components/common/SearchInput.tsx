import { Search, X } from 'lucide-react'
import { Input } from '../ui/Input'

interface SearchInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    className,
}: SearchInputProps) {
    return (
        <div className={`relative ${className ?? ''}`}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="pl-9 pr-9"
            />

            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}