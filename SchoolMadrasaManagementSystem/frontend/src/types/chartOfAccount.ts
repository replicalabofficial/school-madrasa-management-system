import type { Branch } from './branch'

export const ACCOUNT_TYPES = [
    'Cash',
    'Fixed Assets',
    'Accounts Receivable',
    'Inventory',
    'Accounts Payable',
    'Equity–Doesn\'t Close',
    'Equity–Retained Earnings',
    'Income',
    'Cost of Sales',
    'Expenses',
]

export interface ChartOfAccount {
    id: number
    accountId: string
    accountDescription: string
    accountType: string
    isActive: boolean
    branchId: number | null
    branch: Branch | null
}

export interface ChartOfAccountPayload {
    accountId: string
    accountDescription: string
    accountType: string
    isActive: boolean
    branchId: number | null
}