import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/classNames'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export function Button({
    variant = 'primary',
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
                'disabled:cursor-not-allowed disabled:opacity-50',
                {
                    'bg-emerald-700 text-white hover:bg-emerald-800':
                        variant === 'primary',
                    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50':
                        variant === 'secondary',
                    'bg-red-600 text-white hover:bg-red-700':
                        variant === 'danger',
                    'text-slate-600 hover:bg-slate-100 hover:text-slate-900':
                        variant === 'ghost',
                },
                className,
            )}
            {...props}
        >
            {children}
        </button>
    )
}