import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Download, FileDown, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { reportsApi } from '../../api/reportsApi'
import { branchesApi } from '../../api/branchesApi'
import { brandingApi } from '../../api/brandingApi'
import { useAuthStore } from '../../stores/authStore'
import { ACCOUNT_TYPES } from '../../types/chartOfAccount'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import { buildBrandedHeader, formatCellValue, printHtml } from '../../utils/printHtml'
import type {
    AccountFinancialReportRow,
    BranchFinancialReportRow,
    ChartOfAccountReportRow,
    ExpenseReportRow,
    FeeReportRow,
    IncomeReportRow,
    MonthlyFinancialSummaryRow,
    ReportFilterParams,
    SalaryReportRow,
} from '../../types/reports'

type AnyReportRow =
    | IncomeReportRow
    | ExpenseReportRow
    | FeeReportRow
    | SalaryReportRow
    | BranchFinancialReportRow
    | AccountFinancialReportRow
    | ChartOfAccountReportRow
    | MonthlyFinancialSummaryRow

const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })

type ReportKey =
    | 'income'
    | 'expense'
    | 'fees'
    | 'salaries'
    | 'branch-financial'
    | 'account-financial'
    | 'chart-of-accounts'
    | 'monthly-summary'

interface ReportConfig {
    key: ReportKey
    label: string
    hasDateRange: boolean
    hasBranch: boolean
    hasAccountType: boolean
    hasCategory: boolean
    hasStatus: boolean
}

const REPORT_CONFIGS: ReportConfig[] = [
    { key: 'income', label: 'Income Report', hasDateRange: true, hasBranch: true, hasAccountType: true, hasCategory: true, hasStatus: false },
    { key: 'expense', label: 'Expense Report', hasDateRange: true, hasBranch: true, hasAccountType: true, hasCategory: true, hasStatus: false },
    { key: 'fees', label: 'Fee Report', hasDateRange: true, hasBranch: true, hasAccountType: false, hasCategory: true, hasStatus: true },
    { key: 'salaries', label: 'Salary Report', hasDateRange: false, hasBranch: true, hasAccountType: false, hasCategory: false, hasStatus: true },
    { key: 'branch-financial', label: 'Branch Financial Report', hasDateRange: true, hasBranch: false, hasAccountType: false, hasCategory: false, hasStatus: false },
    { key: 'account-financial', label: 'Account Financial Report', hasDateRange: true, hasBranch: false, hasAccountType: true, hasCategory: false, hasStatus: false },
    { key: 'chart-of-accounts', label: 'Chart of Accounts Report', hasDateRange: false, hasBranch: false, hasAccountType: false, hasCategory: false, hasStatus: false },
    { key: 'monthly-summary', label: 'Monthly Financial Summary', hasDateRange: true, hasBranch: true, hasAccountType: false, hasCategory: false, hasStatus: false },
]

function prettifyHeader(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return

    const headers = Object.keys(rows[0])
    const csvRows = [
        headers.map(prettifyHeader).join(','),
        ...rows.map((row) =>
            headers
                .map((h) => `"${formatCellValue(row[h]).replace(/"/g, '""')}"`)
                .join(','),
        ),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

function exportToPdf(
    title: string,
    rows: Record<string, unknown>[],
    institutionName?: string,
    logoPath?: string | null,
) {
    if (rows.length === 0) return

    const headers = Object.keys(rows[0])
    const headerHtml = headers.map((h) => `<th>${prettifyHeader(h)}</th>`).join('')
    const bodyHtml = rows
        .map(
            (row) =>
                `<tr>${headers.map((h) => `<td>${formatCellValue(row[h])}</td>`).join('')}</tr>`,
        )
        .join('')

    const header = buildBrandedHeader(title, institutionName, logoPath, API_ORIGIN)

    printHtml(title, `${header}<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`)
}

export function ReportsPage() {
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [activeReport, setActiveReport] = useState<ReportKey>('income')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [branchId, setBranchId] = useState<number | ''>('')
    const [accountType, setAccountType] = useState('')
    const [category, setCategory] = useState('')
    const [status, setStatus] = useState('')

    const config = REPORT_CONFIGS.find((c) => c.key === activeReport)!

    const filter: ReportFilterParams = {
        dateFrom: config.hasDateRange && dateFrom ? dateFrom : undefined,
        dateTo: config.hasDateRange && dateTo ? dateTo : undefined,
        branchId: config.hasBranch && isHeadOffice && branchId !== '' ? Number(branchId) : undefined,
        accountType: config.hasAccountType && accountType ? accountType : undefined,
        category: config.hasCategory && category ? category : undefined,
        status: config.hasStatus && status ? status : undefined,
    }

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: isHeadOffice && config.hasBranch,
    })

    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.get,
    })

    const reportQuery = useQuery<AnyReportRow[], ApiErrorPayload>({
        queryKey: ['reports', activeReport, filter],
        queryFn: () => {
            switch (activeReport) {
                case 'income': return reportsApi.getIncome(filter)
                case 'expense': return reportsApi.getExpense(filter)
                case 'fees': return reportsApi.getFees(filter)
                case 'salaries': return reportsApi.getSalaries(filter)
                case 'branch-financial': return reportsApi.getBranchFinancial(filter)
                case 'account-financial': return reportsApi.getAccountFinancial(filter)
                case 'chart-of-accounts': return reportsApi.getChartOfAccounts(filter)
                case 'monthly-summary': return reportsApi.getMonthlySummary(filter)
            }
        },
    })

    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    function switchReport(key: ReportKey) {
        setActiveReport(key)
        setBranchId('')
        setAccountType('')
        setCategory('')
        setStatus('')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
                <p className="mt-1 text-sm text-slate-500">Financial and operational reports.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {REPORT_CONFIGS.map((c) => (
                    <button
                        key={c.key}
                        type="button"
                        onClick={() => switchReport(c.key)}
                        className={
                            activeReport === c.key
                                ? 'rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white'
                                : 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50'
                        }
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            <Card className="flex flex-wrap items-end gap-4 p-4">
                {config.hasDateRange && (
                    <>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                        </div>
                    </>
                )}

                {config.hasBranch && isHeadOffice && (
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Branch</label>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
                            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                            <option value="">All branches</option>
                            {activeBranches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {config.hasAccountType && (
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Account Type</label>
                        <select
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value)}
                            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                            <option value="">All types</option>
                            {ACCOUNT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                )}

                {config.hasCategory && (
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                        <Input value={category} onChange={(e) => setCategory(e.target.value)} className="w-40" placeholder="Any" />
                    </div>
                )}

                {config.hasStatus && (
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
                        <Input value={status} onChange={(e) => setStatus(e.target.value)} className="w-40" placeholder="Any" />
                    </div>
                )}
            </Card>

            {reportQuery.isLoading && (
                <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm">Loading report...</span>
                </div>
            )}

            {reportQuery.error && (
                <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Could not load report</p>
                        <p className="mt-1 text-sm text-red-600">{(reportQuery.error as ApiErrorPayload).message}</p>
                    </div>
                </Card>
            )}

            {reportQuery.data && reportQuery.data.length > 0 && (
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => exportToCsv(`${activeReport}-report.csv`, reportQuery.data as unknown as Record<string, unknown>[])}
                    >
                        <Download className="mr-1.5 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() =>
                            exportToPdf(
                                `${activeReport} report`,
                                reportQuery.data as unknown as Record<string, unknown>[],
                                brandingQuery.data?.institutionName,
                                brandingQuery.data?.logoPath,
                            )
                        }
                    >
                        <FileDown className="mr-1.5 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            )}

            {reportQuery.data && (
                <Card className="overflow-hidden">
                    {reportQuery.data.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400">No data found for the selected filters.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            {activeReport === 'income' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Account</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Amount</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as IncomeReportRow[]).map((row) => (
                                            <tr key={row.id} className="border-b border-slate-100">
                                                <td className="px-5 py-3 text-slate-600">{new Date(row.date).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.accountDescription}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.description}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.branchName}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === 'expense' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Account</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Amount</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as ExpenseReportRow[]).map((row) => (
                                            <tr key={row.id} className="border-b border-slate-100">
                                                <td className="px-5 py-3 text-slate-600">{new Date(row.date).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.accountDescription}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.description}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.branchName}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === 'fees' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Serial #</th>
                                        <th className="px-5 py-3 font-medium">Student</th>
                                        <th className="px-5 py-3 font-medium">Category</th>
                                        <th className="px-5 py-3 font-medium">Period</th>
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium">Amount</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as FeeReportRow[]).map((row) => (
                                            <tr key={row.id} className="border-b border-slate-100">
                                                <td className="px-5 py-3 text-slate-600">{row.serialNumber}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.studentName}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.category}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.feePeriod}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.branchName}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.status}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === 'salaries' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Staff</th>
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Month</th>
                                        <th className="px-5 py-3 font-medium">Net Salary</th>
                                        <th className="px-5 py-3 font-medium">Paid</th>
                                        <th className="px-5 py-3 font-medium">Remaining</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as SalaryReportRow[]).map((row) => (
                                            <tr key={row.id} className="border-b border-slate-100">
                                                <td className="px-5 py-3 text-slate-600">{row.staffName}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.branchName}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.salaryMonth}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.netSalary)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.paidAmount)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.remainingAmount)}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === 'branch-financial' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Branch</th>
                                        <th className="px-5 py-3 font-medium">Fees</th>
                                        <th className="px-5 py-3 font-medium">Income</th>
                                        <th className="px-5 py-3 font-medium">Expenses</th>
                                        <th className="px-5 py-3 font-medium">Salaries</th>
                                        <th className="px-5 py-3 font-medium">Net Balance</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as BranchFinancialReportRow[]).map((row) => (
                                            <tr key={row.branchId} className="border-b border-slate-100">
                                                <td className="px-5 py-3 font-medium text-slate-800">{row.branchName}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalFees)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalIncome)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalExpenses)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalSalary)}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.netBalance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === 'account-financial' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Account</th>
                                        <th className="px-5 py-3 font-medium">Type</th>
                                        <th className="px-5 py-3 font-medium">Total Income</th>
                                        <th className="px-5 py-3 font-medium">Total Expense</th>
                                        <th className="px-5 py-3 font-medium">Net</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as AccountFinancialReportRow[]).map((row) => (
                                            <tr key={row.chartOfAccountId} className="border-b border-slate-100">
                                                <td className="px-5 py-3 font-medium text-slate-800">{row.accountDescription}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.accountType}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalIncome)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalExpense)}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.netAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === 'chart-of-accounts' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Account ID</th>
                                        <th className="px-5 py-3 font-medium">Description</th>
                                        <th className="px-5 py-3 font-medium">Type</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as ChartOfAccountReportRow[]).map((row) => (
                                            <tr key={row.id} className="border-b border-slate-100">
                                                <td className="px-5 py-3 font-medium text-slate-800">{row.accountId}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.accountDescription}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.accountType}</td>
                                                <td className="px-5 py-3 text-slate-600">{row.isActive ? 'Active' : 'Inactive'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === 'monthly-summary' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-5 py-3 font-medium">Month</th>
                                        <th className="px-5 py-3 font-medium">Fees</th>
                                        <th className="px-5 py-3 font-medium">Income</th>
                                        <th className="px-5 py-3 font-medium">Expenses</th>
                                        <th className="px-5 py-3 font-medium">Salaries</th>
                                        <th className="px-5 py-3 font-medium">Net Balance</th>
                                    </tr></thead>
                                    <tbody>
                                        {(reportQuery.data as MonthlyFinancialSummaryRow[]).map((row) => (
                                            <tr key={row.month} className="border-b border-slate-100">
                                                <td className="px-5 py-3 font-medium text-slate-800">{row.month}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalFees)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalIncome)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalExpenses)}</td>
                                                <td className="px-5 py-3 text-slate-600">{currencyFormatter.format(row.totalSalary)}</td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{currencyFormatter.format(row.netBalance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}