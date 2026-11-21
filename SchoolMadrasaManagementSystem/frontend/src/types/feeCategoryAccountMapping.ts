import type { Branch } from './branch'
import type { ChartOfAccount } from './chartOfAccount'

export interface FeeCategoryAccountMapping {
    id: number
    category: string
    branchId: number | null
    branch: Branch | null
    chartOfAccountId: number
    chartOfAccount: ChartOfAccount | null
}