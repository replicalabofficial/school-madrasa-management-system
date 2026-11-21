export interface DashboardFilter {
    branchId?: number
    dateFrom?: string
    dateTo?: string
}

export interface DashboardCategory {
    category: string
    amount: number
}

export interface MonthlyDashboard {
    month: string
    income: number
    expenses: number
    netBalance: number
}

export interface BranchDashboardFinancial {
    branchId: number
    branchName: string
    income: number // other income
    expenses: number // operating expenses
    salaries: number // salaries paid
    fees: number // fees collected
    netBalance: number
}

export interface RecentExpense {
    id: number
    date: string
    category: string
    amount: number
    description: string
    branchName: string
}

export interface HeadOfficeDashboard {
    totalBranches: number
    totalStudents: number
    totalStaff: number
    otherIncome: number
    feesCollected: number
    totalIncome: number
    operatingExpenses: number
    salariesPaid: number
    totalExpenses: number
    totalSalaries: number
    outstandingFees: number
    unpaidSalaries: number
    netBalance: number
    incomeOverview: DashboardCategory[]
    expenseOverview: DashboardCategory[]
    monthlyIncomeVsExpense: MonthlyDashboard[]
    branchFinancialOverview: BranchDashboardFinancial[]
    recentExpenses: RecentExpense[]
}

export interface BranchDashboard {
    branchId: number
    branchName: string
    totalStudents: number
    totalStaff: number
    totalFees: number
    feesCollected: number
    outstandingFees: number
    otherIncome: number
    totalIncome: number
    operatingExpenses: number
    salariesPaid: number
    totalExpenses: number
    unpaidSalaries: number
    netBalance: number
}