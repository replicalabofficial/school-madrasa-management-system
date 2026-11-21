import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { studentsApi } from '../../api/studentsApi'
import { branchesApi } from '../../api/branchesApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { Student } from '../../types/student'

interface Props {
    students: Student[]
    onClose: () => void
    onDone: () => void
}

const selectClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

const sortClasses = (list: string[]) => list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

export function ClassPromotionModal({ students, onClose, onDone }: Props) {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [branchId, setBranchId] = useState<number | ''>(isHeadOffice ? '' : (user?.branchId ?? ''))
    const [fromClass, setFromClass] = useState('')
    const [action, setAction] = useState<'promote' | 'left'>('promote')
    const [toClass, setToClass] = useState('')
    const [unchecked, setUnchecked] = useState<Set<number>>(new Set())
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [doneMessage, setDoneMessage] = useState<string | null>(null)

    const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll, enabled: isHeadOffice })

    const active = students.filter((s) => s.isActive)
    const branchStudents = branchId === '' ? [] : active.filter((s) => s.branchId === branchId)
    const classes = useMemo(() => sortClasses(Array.from(new Set(branchStudents.map((s) => s.class)))), [branchStudents])
    const allClasses = useMemo(() => sortClasses(Array.from(new Set(active.map((s) => s.class)))), [active])
    const classStudents = fromClass ? branchStudents.filter((s) => s.class === fromClass).sort((a, b) => a.name.localeCompare(b.name)) : []
    const selectedIds = classStudents.filter((s) => !unchecked.has(s.id)).map((s) => s.id)

    function toggle(id: number) {
        setUnchecked((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    async function submit() {
        setError(null)
        if (selectedIds.length === 0) return setError('Select at least one student.')
        if (action === 'promote' && !toClass.trim()) return setError('Enter the new class.')
        if (action === 'promote' && toClass.trim() === fromClass) return setError('New class is the same as the current class.')

        setBusy(true)
        try {
            const result = await studentsApi.promote({
                studentIds: selectedIds,
                toClass: action === 'promote' ? toClass.trim() : undefined,
                markAsLeft: action === 'left',
                leftDate: action === 'left' ? new Date().toISOString().slice(0, 10) : undefined,
            })
            setDoneMessage(
                action === 'promote'
                    ? `${result.updatedCount} students moved from ${fromClass} to ${toClass.trim()}.`
                    : `${result.updatedCount} students marked as Passed out / Left.`,
            )
            setFromClass('')
            setUnchecked(new Set())
            onDone()
        } catch (err) {
            setError((err as ApiErrorPayload).message ?? 'Promotion failed.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Class Promotion</h2>
                    <button type="button" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
                    {doneMessage && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
                            ✓ {doneMessage} You can promote another class.
                        </div>
                    )}
                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

                    <div className="grid gap-3 sm:grid-cols-2">
                        {isHeadOffice && (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                                <select
                                    value={branchId}
                                    onChange={(e) => {
                                        setBranchId(e.target.value ? Number(e.target.value) : '')
                                        setFromClass('')
                                        setUnchecked(new Set())
                                    }}
                                    className={selectClass}
                                >
                                    <option value="">Select branch</option>
                                    {(branchesQuery.data ?? []).filter((b) => b.isActive).map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Current class</label>
                            <select
                                value={fromClass}
                                disabled={branchId === ''}
                                onChange={(e) => {
                                    setFromClass(e.target.value)
                                    setUnchecked(new Set())
                                    setDoneMessage(null)
                                }}
                                className={selectClass}
                            >
                                <option value="">Select class</option>
                                {classes.map((c) => (
                                    <option key={c} value={c}>
                                        {c} ({branchStudents.filter((s) => s.class === c).length})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {fromClass && (
                        <>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                                <label className="flex items-center gap-2">
                                    <input type="radio" checked={action === 'promote'} onChange={() => setAction('promote')} />
                                    Promote to next class
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" checked={action === 'left'} onChange={() => setAction('left')} />
                                    Mark as Passed out / Left (final class)
                                </label>
                            </div>

                            {action === 'promote' && (
                                <div className="max-w-xs">
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">New class</label>
                                    <Input list="efas-class-list" value={toClass} onChange={(e) => setToClass(e.target.value)} placeholder="e.g. 4" />
                                    <datalist id="efas-class-list">
                                        {allClasses.map((c) => (
                                            <option key={c} value={c} />
                                        ))}
                                    </datalist>
                                </div>
                            )}

                            <div className="rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                    <span className="font-medium text-slate-700">
                                        {selectedIds.length} of {classStudents.length} selected
                                    </span>
                                    <div className="flex gap-3">
                                        <button type="button" className="text-emerald-700 hover:underline" onClick={() => setUnchecked(new Set())}>
                                            Select all
                                        </button>
                                        <button type="button" className="text-slate-500 hover:underline" onClick={() => setUnchecked(new Set(classStudents.map((s) => s.id)))}>
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {classStudents.map((s) => (
                                        <label key={s.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0">
                                            <input type="checkbox" checked={!unchecked.has(s.id)} onChange={() => toggle(s.id)} />
                                            <span className="w-24 text-slate-500">{s.grNumber}</span>
                                            <span className="text-slate-800">{s.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">Untick students who failed or should stay in the same class. Fee history is not changed.</p>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
                        Close
                    </Button>
                    {fromClass && (
                        <Button type="button" onClick={submit} disabled={busy || selectedIds.length === 0}>
                            {busy
                                ? 'Saving...'
                                : action === 'promote'
                                    ? `Promote ${selectedIds.length} students`
                                    : `Mark ${selectedIds.length} as Passed out`}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}