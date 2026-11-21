import type { LedgerEntry } from './ledger'

export interface LedgerReport {
    chartOfAccountId: number
    accountId: string
    accountDescription: string
    accountType: string
    dateFrom: string | null
    dateTo: string | null
    openingBalance: number
    totalDebit: number
    totalCredit: number
    closingBalance: number
    entries: LedgerEntry[]
}

export interface LedgerAccountOption {
    id: number
    accountId: string
    accountDescription: string
    accountType: string
}