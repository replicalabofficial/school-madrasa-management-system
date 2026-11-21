export interface PeriodLock {
    lockedUpTo: string | null
    updatedByName: string
    updatedAt: string | null
}

export interface YearEndLine {
    accountId: string
    accountDescription: string
    accountType: string
    branchName: string
    amount: number
}

export interface YearEndPreview {
    yearEndDate: string
    totalIncome: number
    totalExpenses: number
    netIncome: number
    lines: YearEndLine[]
}

export interface CloseYearRequest {
    yearEndDate: string
    lockBooks: boolean
}