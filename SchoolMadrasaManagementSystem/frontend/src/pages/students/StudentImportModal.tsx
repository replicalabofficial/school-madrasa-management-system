import { useState, type ChangeEvent } from 'react'
import { Download, FileUp, Loader2, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { studentsApi } from '../../api/studentsApi'
import { useAuthStore } from '../../stores/authStore'
import type { ApiErrorPayload } from '../../api/client'
import type { StudentImportResult, StudentImportRow } from '../../types/student'

interface Props {
    onClose: () => void
    onImported: () => void
}

const MAX_FILE_BYTES = 2 * 1024 * 1024

// Simple CSV parser: handles quotes, commas inside quotes, ; or , separators and Excel BOM
function parseCsv(text: string): string[][] {
    const clean = text.replace(/^﻿/, '')
    const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
    const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','

    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let inQuotes = false

    for (let i = 0; i < clean.length; i++) {
        const ch = clean[i]
        if (inQuotes) {
            if (ch === '"') {
                if (clean[i + 1] === '"') {
                    cell += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                cell += ch
            }
        } else if (ch === '"') {
            inQuotes = true
        } else if (ch === sep) {
            row.push(cell)
            cell = ''
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && clean[i + 1] === '\n') i++
            row.push(cell)
            rows.push(row)
            row = []
            cell = ''
        } else {
            cell += ch
        }
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell)
        rows.push(row)
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const HEADER_ALIASES: Record<'grNumber' | 'name' | 'class' | 'branch', string[]> = {
    grNumber: ['gr', 'gr no', 'gr number', 'grno', 'gr #', 'gr#', 'admission no'],
    name: ['name', 'student name', 'student'],
    class: ['class', 'grade', 'darja'],
    branch: ['branch', 'branch code', 'branch name', 'campus'],
}

function findColumn(headers: string[], key: keyof typeof HEADER_ALIASES): number {
    const normalized = headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, ' '))
    return normalized.findIndex((h) => HEADER_ALIASES[key].includes(h))
}

function downloadTemplate(isHeadOffice: boolean) {
    const lines = isHeadOffice
        ? ['GR Number,Name,Class,Branch', '1001,Ahmed Ali,3,003', '1002,Usman Tariq,5,002']
        : ['GR Number,Name,Class', '1001,Ahmed Ali,3', '1002,Usman Tariq,5']
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'efas-students-template.csv'
    link.click()
    URL.revokeObjectURL(url)
}

export function StudentImportModal({ onClose, onImported }: Props) {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [fileName, setFileName] = useState('')
    const [rows, setRows] = useState<StudentImportRow[]>([])
    const [result, setResult] = useState<StudentImportResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [showErrorsOnly, setShowErrorsOnly] = useState(false)

    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        setError(null)
        setResult(null)
        setRows([])
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Please upload a .csv file. In Excel: File → Save As → "CSV UTF-8 (Comma delimited)".')
            return
        }
        if (file.size > MAX_FILE_BYTES) {
            setError('File is too large (max 2 MB).')
            return
        }

        setFileName(file.name)
        const table = parseCsv(await file.text())
        if (table.length < 2) {
            setError('The file has no student rows.')
            return
        }

        const headers = table[0]
        const grCol = findColumn(headers, 'grNumber')
        const nameCol = findColumn(headers, 'name')
        const classCol = findColumn(headers, 'class')
        const branchCol = findColumn(headers, 'branch')

        const missing = [
            grCol < 0 ? 'GR Number' : null,
            nameCol < 0 ? 'Name' : null,
            classCol < 0 ? 'Class' : null,
            isHeadOffice && branchCol < 0 ? 'Branch' : null,
        ].filter(Boolean)

        if (missing.length > 0) {
            setError(`Missing column(s): ${missing.join(', ')}. Download the template to see the format.`)
            return
        }

        const parsed: StudentImportRow[] = table.slice(1).map((r, i) => ({
            rowNumber: i + 2, // Excel row number (row 1 = headers)
            grNumber: (r[grCol] ?? '').trim(),
            name: (r[nameCol] ?? '').trim(),
            class: (r[classCol] ?? '').trim(),
            branch: branchCol >= 0 ? (r[branchCol] ?? '').trim() : undefined,
        }))

        setRows(parsed)
        await check(parsed)
    }

    async function check(data: StudentImportRow[]) {
        setBusy(true)
        try {
            setResult(await studentsApi.importStudents(data, false))
        } catch (err) {
            setError((err as ApiErrorPayload).message ?? 'Could not check the file.')
        } finally {
            setBusy(false)
        }
    }

    async function commit() {
        setBusy(true)
        setError(null)
        try {
            const saved = await studentsApi.importStudents(rows, true)
            setResult(saved)
            onImported()
        } catch (err) {
            setError((err as ApiErrorPayload).message ?? 'Import failed.')
        } finally {
            setBusy(false)
        }
    }

    const visibleRows = (result?.rows ?? []).filter((r) => !showErrorsOnly || r.status === 'Error')

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Import Students (Excel / CSV)</h2>
                    <button type="button" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                        <p>
                            Columns: <strong>GR Number, Name, Class{isHeadOffice ? ', Branch' : ''}</strong>
                            {isHeadOffice ? ' — Branch can be the branch code (e.g. 003) or the exact branch name.' : ' — students are added to your branch.'}
                        </p>
                        <p className="mt-1">In Excel use <strong>File → Save As → CSV UTF-8</strong>, then upload. Nothing is saved until you click Import.</p>
                    </div>

                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

                    <div className="flex flex-wrap items-center gap-3">
                        <label className={`inline-flex cursor-pointer items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                            <FileUp className="mr-1.5 h-4 w-4" />
                            Choose CSV file
                            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                        </label>
                        <Button type="button" variant="secondary" onClick={() => downloadTemplate(isHeadOffice)}>
                            <Download className="mr-1.5 h-4 w-4" />
                            Download template
                        </Button>
                        {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
                        {busy && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                    </div>

                    {result && (
                        <>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500">Rows in file</p>
                                    <p className="text-xl font-bold text-slate-900">{result.totalRows}</p>
                                </div>
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                    <p className="text-xs text-emerald-700">{result.committed ? 'Imported' : 'Ready to import'}</p>
                                    <p className="text-xl font-bold text-emerald-800">{result.committed ? result.importedCount : result.validRows}</p>
                                </div>
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                    <p className="text-xs text-red-700">With errors (skipped)</p>
                                    <p className="text-xl font-bold text-red-700">{result.errorRows}</p>
                                </div>
                            </div>

                            {result.errorRows > 0 && (
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={showErrorsOnly} onChange={(e) => setShowErrorsOnly(e.target.checked)} />
                                    Show only rows with errors
                                </label>
                            )}

                            <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-slate-50">
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="px-3 py-2 font-medium">Row</th>
                                            <th className="px-3 py-2 font-medium">GR</th>
                                            <th className="px-3 py-2 font-medium">Name</th>
                                            <th className="px-3 py-2 font-medium">Class</th>
                                            <th className="px-3 py-2 font-medium">Branch</th>
                                            <th className="px-3 py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleRows.map((r) => (
                                            <tr key={r.rowNumber} className="border-b border-slate-100">
                                                <td className="px-3 py-1.5 text-slate-500">{r.rowNumber}</td>
                                                <td className="px-3 py-1.5 text-slate-800">{r.grNumber || '—'}</td>
                                                <td className="px-3 py-1.5 text-slate-700">{r.name || '—'}</td>
                                                <td className="px-3 py-1.5 text-slate-700">{r.class || '—'}</td>
                                                <td className="px-3 py-1.5 text-slate-700">{r.branchName || '—'}</td>
                                                <td className="px-3 py-1.5">
                                                    {r.status === 'Error' ? (
                                                        <span className="text-xs text-red-600">{r.message}</span>
                                                    ) : r.status === 'Imported' ? (
                                                        <span className="text-xs font-medium text-emerald-700">✓ Imported</span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-emerald-700">Ready</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
                        {result?.committed ? 'Close' : 'Cancel'}
                    </Button>
                    {result && !result.committed && (
                        <Button type="button" onClick={commit} disabled={busy || result.validRows === 0}>
                            {busy ? 'Importing...' : `Import ${result.validRows} students`}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}