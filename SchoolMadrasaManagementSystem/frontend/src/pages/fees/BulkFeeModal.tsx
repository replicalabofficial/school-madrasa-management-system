import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { feesApi } from '../../api/feesApi'
import { studentsApi } from '../../api/studentsApi'
import { branchesApi } from '../../api/branchesApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import { FEE_CATEGORIES, type Fee, type FeePayload } from '../../types/fee'
import type { Student } from '../../types/student'
import { MONTHS, buildSerialNumber, buildYearOptions } from '../../utils/feeSerial'

const selectClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

const CONCURRENCY = 4

interface Props {
    existingFees: Fee[]
    onClose: () => void
    onDone: () => void
}

interface Job {
    student: Student
    category: string
    amount: number
    serial: string
}

export function BulkFeeModal({ existingFees, onClose, onDone }: Props) {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'
    const now = new Date()

    const [branchId, setBranchId] = useState<number | ''>(isHeadOffice ? '' : (user?.branchId ?? ''))
    const [className, setClassName] = useState('')
    const [amounts, setAmounts] = useState<Record<string, string>>({ 'Monthly Fee': '' })
    const [month, setMonth] = useState(MONTHS[now.getMonth()])
    const [year, setYear] = useState(now.getFullYear())
    const [date, setDate] = useState(now.toISOString().slice(0, 10))
    const [description, setDescription] = useState('')

    const [error, setError] = useState<string | null>(null)
    const [running, setRunning] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 })
    const [failures, setFailures] = useState<string[]>([])
    const [finished, setFinished] = useState(false)

    const studentsQuery = useQuery<Student[], ApiErrorPayload>({ queryKey: ['students'], queryFn: studentsApi.getAll })
    const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll, enabled: isHeadOffice })

    const activeStudents = (studentsQuery.data ?? []).filter((s) => s.isActive)
    const branchStudents = branchId === '' ? [] : activeStudents.filter((s) => s.branchId === branchId)
    const classes = Array.from(new Set(branchStudents.map((s) => s.class))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    const targetStudents = className ? branchStudents.filter((s) => s.class === className) : branchStudents

    const existingSerials = useMemo(() => new Set(existingFees.map((f) => f.serialNumber.toLowerCase())), [existingFees])

    const categories = Object.entries(amounts).filter(([, v]) => v !== undefined)

    const jobs: Job[] = []
    for (const student of targetStudents) {
        for (const [category, value] of categories) {
            const amount = Number(value)
            if (!amount || amount <= 0) continue
            jobs.push({ student, category, amount, serial: buildSerialNumber(student.grNumber, category, month, year) })
        }
    }

    const newJobs = jobs.filter((j) => !existingSerials.has(j.serial.toLowerCase()))
    const skipped = jobs.length - newJobs.length

    function toggleCategory(category: string, checked: boolean) {
        setAmounts((current) => {
            const next = { ...current }
            if (checked) next[category] = next[category] ?? ''
            else delete next[category]
            return next
        })
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        if (branchId === '') return setError('Select a branch.')
        if (categories.length === 0) return setError('Select at least one fee category.')
        for (const [category, value] of categories) {
            if (!value || Number(value) <= 0) return setError(`Enter a valid amount for ${category}.`)
        }
        if (targetStudents.length === 0) return setError('No active students found for this selection.')
        if (newJobs.length === 0) return setError('All these fees already exist. Nothing to generate.')

        setRunning(true)
        setFinished(false)
        setFailures([])
        setProgress({ done: 0, total: newJobs.length, failed: 0 })

        const queue = [...newJobs]
        const failed: string[] = []
        let done = 0

        async function worker() {
            while (queue.length > 0) {
                const job = queue.shift()!
                const payload: FeePayload = {
                    serialNumber: job.serial,
                    studentId: job.student.id,
                    category: job.category,
                    amount: job.amount,
                    feePeriod: `${month} ${year}`,
                    date,
                    status: 'Pending',
                    description: description.trim() || null,
                    discountAmount: 0,
                }
                try {
                    await feesApi.create(payload)
                } catch (err) {
                    failed.push(`${job.student.grNumber} ${job.student.name} — ${job.category}: ${(err as ApiErrorPayload).message ?? 'failed'}`)
                }
                done++
                setProgress({ done, total: newJobs.length, failed: failed.length })
            }
        }

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, newJobs.length) }, () => worker()))

        setFailures(failed)
        setRunning(false)
        setFinished(true)
        onDone()
    }

    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Generate Fees for a Class</h2>
                    <button type="button" onClick={onClose} disabled={running} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

                    {isHeadOffice && (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                            <select
                                value={branchId}
                                disabled={running}
                                onChange={(e) => {
                                    setBranchId(e.target.value ? Number(e.target.value) : '')
                                    setClassName('')
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
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
                        <select value={className} disabled={running || branchId === ''} onChange={(e) => setClassName(e.target.value)} className={selectClass}>
                            <option value="">All classes ({branchStudents.length} students)</option>
                            {classes.map((c) => (
                                <option key={c} value={c}>
                                    {c} ({branchStudents.filter((s) => s.class === c).length} students)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee categories &amp; amount per student</label>
                        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                            {FEE_CATEGORIES.map((cat) => {
                                const checked = cat in amounts
                                return (
                                    <div key={cat} className="flex items-center gap-3">
                                        <label className="flex w-40 items-center gap-2 text-sm text-slate-700">
                                            <input type="checkbox" checked={checked} disabled={running} onChange={(e) => toggleCategory(cat, e.target.checked)} />
                                            {cat}
                                        </label>
                                        {checked && (
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="Amount"
                                                disabled={running}
                                                value={amounts[cat]}
                                                onChange={(e) => setAmounts((v) => ({ ...v, [cat]: e.target.value }))}
                                                className="flex-1"
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Month</label>
                            <select value={month} disabled={running} onChange={(e) => setMonth(e.target.value)} className={selectClass}>
                                {MONTHS.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Year</label>
                            <select value={year} disabled={running} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
                                {buildYearOptions().map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee date</label>
                            <Input type="date" value={date} disabled={running} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description (optional)</label>
                            <Input value={description} disabled={running} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    {branchId !== '' && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {studentsQuery.isLoading ? (
                                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading students...</span>
                            ) : (
                                <>
                                    <strong>{newJobs.length}</strong> fee records will be created for <strong>{targetStudents.length}</strong> students.
                                    {skipped > 0 && <> <strong>{skipped}</strong> already exist and will be skipped.</>}
                                </>
                            )}
                        </div>
                    )}

                    {(running || finished) && (
                        <div className="space-y-2">
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
                            </div>
                            <p className="text-sm text-slate-600">
                                {progress.done} / {progress.total} done{progress.failed > 0 ? ` · ${progress.failed} failed` : ''}
                                {finished && progress.failed === 0 ? ' — all fees created ✓' : ''}
                            </p>
                            {failures.length > 0 && (
                                <div className="max-h-32 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                    {failures.map((f, i) => (
                                        <div key={i}>{f}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={running}>
                            {finished ? 'Close' : 'Cancel'}
                        </Button>
                        {!finished && (
                            <Button type="submit" disabled={running || newJobs.length === 0}>
                                {running ? 'Generating...' : `Generate ${newJobs.length} fees`}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}