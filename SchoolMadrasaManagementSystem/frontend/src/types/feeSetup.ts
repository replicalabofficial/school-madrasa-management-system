import type { Branch } from './branch'

// ---------- Fee Setup ----------
export interface FeeStructure {
    id: number
    branchId: number
    branch: Branch | null
    session: string
    class: string
    monthlyFee: number
    newAdmissionMonthlyFee: number
    admissionFee: number
    formFee: number
    stationeryFee: number
    createdAt: string
    updatedAt: string | null
}

export interface FeeStructurePayload {
    branchId: number
    session: string
    class: string
    monthlyFee: number
    newAdmissionMonthlyFee: number
    admissionFee: number
    formFee: number
    stationeryFee: number
}

export interface ApplyFeeStructureRequest {
    branchId: number
    session: string
    skipIfLower: boolean
    commit: boolean
}

export interface ApplyFeeStructureRow {
    studentId: number
    grNumber: string
    name: string
    class: string
    oldFee: number
    newFee: number
    status: 'Change' | 'NoChange' | 'Skipped' | 'NoSetup'
}

export interface ApplyFeeStructureResult {
    totalStudents: number
    changedCount: number
    noSetupCount: number
    committed: boolean
    rows: ApplyFeeStructureRow[]
}

// ---------- Monthly Fee Posting ----------
export interface FeePostingRequest {
    branchId: number
    month: number
    year: number
    class?: string | null
    feeDate: string
}

export interface FeePostingRow {
    studentId: number
    grNumber: string
    name: string
    class: string
    serialNumber: string
    gross: number
    discount: number
    net: number
    discountStatus: string | null
    status: 'New' | 'AlreadyPosted' | 'NoFee' | 'Posted'
}

export interface FeePostingClassSummary {
    class: string
    studentCount: number
    gross: number
    discount: number
    net: number
}

export interface FeePostingPreview {
    period: string
    newCount: number
    alreadyPostedCount: number
    noFeeCount: number
    grossTotal: number
    discountTotal: number
    netTotal: number
    postingId: number | null
    classes: FeePostingClassSummary[]
    rows: FeePostingRow[]
}

export interface FeePostingListItem {
    id: number
    branchId: number
    branchName: string
    period: string
    month: number
    year: number
    class: string | null
    feeDate: string
    studentCount: number
    grossTotal: number
    discountTotal: number
    netTotal: number
    paidCount: number
    postedBy: string
    postedAt: string
}
