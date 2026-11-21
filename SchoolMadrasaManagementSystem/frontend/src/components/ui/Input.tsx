import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils/classNames'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5',
                'text-sm text-slate-900 outline-none transition',
                'placeholder:text-slate-400',
                'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10',
                className,
            )}
            {...props}
        />
    )
}