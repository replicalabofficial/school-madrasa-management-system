import type { Staff } from './staff'
import type { Branch } from './branch'
import type { ChartOfAccount } from './chartOfAccount'

export interface Salary {
    id: number
    staffId: number
    staff: Staff | null
    branchId: number
    branch: Branch | null
    salaryMonth: string
    basicSalary: number
    allowances: number
    deductions: number
    netSalary: number
    paidAmount: number
    remainingAmount: number
    status: string
    paymentDate: string | null
    notes: string | null
}

export interface SalaryPayload {
    staffId: number
    salaryMonth: string
    basicSalary: number
    allowances: number
    deductions: number
    notes?: string | null
}

export interface SalaryPaymentPayload {
    paymentAmount: number
    paymentDate: string
    chartOfAccountId: number
    sourceAccountId: number
}

export interface SalaryAdjustment {
    id: number
    staffId: number
    staff: Staff | null
    branchId: number
    amount: number
    date: string
    reason: string
    chartOfAccountId: number
    chartOfAccount: ChartOfAccount | null
    sourceAccountId: number
    sourceAccount: ChartOfAccount | null
}

export interface SalaryAdjustmentPayload {
    staffId: number
    amount: number
    date: string
    reason: string
    chartOfAccountId: number
    sourceAccountId: number
}