import type { Branch } from './branch'

export interface Student {
    id: number
    name: string
    class: string
    branchId: number
    branch: Branch | null
    grNumber: string
    createdAt: string
    isActive: boolean
    leftDate: string | null
    fatherName: string | null
    fatherCnic: string | null
    parentPhone: string | null
    admissionDate: string | null
    monthlyFee: number
    monthlyDiscount: number
    discountStatus: 'PendingApproval' | 'Approved' | null
}

export interface StudentPayload {
    name: string
    class: string
    branchId: number
    grNumber: string
    fatherName?: string | null
    fatherCnic?: string | null
    parentPhone?: string | null
    admissionDate?: string | null
    monthlyFee: number
    monthlyDiscount: number
}

// ---- Import (Excel/CSV) ----
export interface StudentImportRow {
    rowNumber: number
    grNumber: string
    name: string
    class: string
    branch?: string
    fatherName?: string
    fatherCnic?: string
    parentPhone?: string
    monthlyFee?: number
}

export interface StudentImportRowResult {
    rowNumber: number
    grNumber: string
    name: string
    class: string
    branchName: string
    monthlyFee: number
    status: 'Ready' | 'Imported' | 'Error'
    message: string
}

export interface StudentImportResult {
    totalRows: number
    validRows: number
    errorRows: number
    importedCount: number
    committed: boolean
    rows: StudentImportRowResult[]
}

// ---- Class promotion ----
export interface StudentPromotionRequest {
    studentIds: number[]
    toClass?: string
    markAsLeft: boolean
    leftDate?: string
}