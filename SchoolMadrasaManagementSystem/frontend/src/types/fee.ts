import type { Student } from './student'
import type { Branch } from './branch'
import type { ChartOfAccount } from './chartOfAccount'

export interface Fee {
    id: number
    serialNumber: string
    studentId: number
    student: Student | null
    category: string
    amount: number
    feePeriod: string
    date: string
    status: string
    notes: string | null
    description: string | null
    discountAmount: number
    discountApprovalStatus: string | null
    paidDate: string | null
    branchId: number
    branch: Branch | null
    chartOfAccountId: number | null
    chartOfAccount: ChartOfAccount | null
    sourceAccountId: number | null
    sourceAccount: ChartOfAccount | null
}

export interface FeePayload {
    serialNumber: string
    studentId: number
    category: string
    amount: number
    feePeriod: string
    date: string
    status: string
    notes?: string | null
    chartOfAccountId?: number | null
    description?: string | null
    discountAmount?: number
}

export const FEE_CATEGORIES = ['Monthly Fee', 'Annual Fee', 'Admission Fee', 'Stationery', 'Form']

export const FEE_CATEGORY_CODE: Record<string, string> = {
    'Monthly Fee': 'MF',
    'Annual Fee': 'AF',
    'Admission Fee': 'ADM',
    Stationery: 'STY',
    Form: 'FRM',
}