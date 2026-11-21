export type OpeningEntryType = 'Debit' | 'Credit'

export interface OpeningBalance {
    id: number
    chartOfAccountId: number
    accountId: string
    accountDescription: string
    accountType: string
    branchId: number
    branchName: string
    entryType: OpeningEntryType
    amount: number
    date: string
    description: string
}

export interface CreateOpeningBalanceRequest {
    chartOfAccountId: number
    branchId: number
    entryType: OpeningEntryType
    amount: number
    date: string
    description?: string
}