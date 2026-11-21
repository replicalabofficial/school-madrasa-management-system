export interface TrialBalanceRow {
    chartOfAccountId: number
    accountId: string
    accountDescription: string
    accountType: string
    debit: number
    credit: number
}

export interface BalanceSheetLine {
    accountDescription: string
    balance: number
}

export interface BalanceSheet {
    assets: BalanceSheetLine[]
    liabilities: BalanceSheetLine[]
    equity: BalanceSheetLine[]
    totalAssets: number
    totalLiabilities: number
    totalEquity: number
    totalLiabilitiesAndEquity: number
}

export interface IncomeStatement {
    incomeLines: BalanceSheetLine[]
    expenseLines: BalanceSheetLine[]
    totalIncome: number
    totalExpenses: number
    netIncome: number
}