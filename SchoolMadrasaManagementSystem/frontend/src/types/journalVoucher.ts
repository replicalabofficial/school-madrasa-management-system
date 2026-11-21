export interface JournalVoucherLine {
    id: number
    chartOfAccountId: number
    accountId: string
    accountDescription: string
    branchId: number | null
    branchName: string
    debit: number
    credit: number
    note: string
}

export interface JournalVoucher {
    id: number
    entryNumber: string
    date: string
    description: string
    entryType: 'Manual' | 'YearEndClosing'
    createdByName: string
    createdAt: string
    totalDebit: number
    totalCredit: number
    lines: JournalVoucherLine[]
}

export interface CreateJournalVoucherLine {
    chartOfAccountId: number
    branchId: number | null
    debit: number
    credit: number
    note?: string
}

export interface CreateJournalVoucherRequest {
    date: string
    description: string
    lines: CreateJournalVoucherLine[]
}