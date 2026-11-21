import type { ChartOfAccount } from './chartOfAccount'
import type { Branch } from './branch'

export interface FinancialEntry {
    id: number
    date: string
    category: string
    chartOfAccountId: number
    chartOfAccount: ChartOfAccount | null
    amount: number
    description: string
    branchId: number
    branch: Branch | null
    notes: string | null
    sourceAccountId: number | null
    sourceAccount: ChartOfAccount | null
}

export interface FinancialEntryPayload {
    date: string
    chartOfAccountId: number
    amount: number
    description: string
    branchId: number
    notes?: string | null
    sourceAccountId: number
}