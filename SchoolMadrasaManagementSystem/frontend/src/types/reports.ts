export interface ReportFilterParams {
    dateFrom?: string
    dateTo?: string
    branchId?: number
    accountType?: string
    category?: string
    status?: string
}

export interface IncomeReportRow {
    id: number
    date: string
    category: string
    accountId: string
    accountDescription: string
    amount: number
    description: string
    branchName: string
    branchId: number
}

export interface ExpenseReportRow {
    id: number
    date: string
    category: string
    accountId: string
    accountDescription: string
    amount: number
    description: string
    branchName: string
    branchId: number
}

export interface FeeReportRow {
    id: number
    serialNumber: string
    studentName: string
    category: string
    amount: number
    feePeriod: string
    date: string
    status: string
    branchName: string
    branchId: number
}

export interface SalaryReportRow {
    id: number
    staffName: string
    branchName: string
    salaryMonth: string
    basicSalary: number
    allowances: number
    deductions: number
    netSalary: number
    paidAmount: number
    remainingAmount: number
    status: string
    paymentDate: string | null
    branchId: number
}

export interface BranchFinancialReportRow {
    branchId: number
    branchName: string
    totalFees: number
    totalIncome: number
    totalExpenses: number
    totalSalary: number
    netBalance: number
}

export interface AccountFinancialReportRow {
    chartOfAccountId: number
    accountId: string
    accountDescription: string
    accountType: string
    totalIncome: number
    totalExpense: number
    netAmount: number
}

export interface ChartOfAccountReportRow {
    id: number
    accountId: string
    accountDescription: string
    accountType: string
    isActive: boolean
}

export interface MonthlyFinancialSummaryRow {
    month: string
    totalFees: number
    totalIncome: number
    totalExpenses: number
    totalSalary: number
    netBalance: number
}