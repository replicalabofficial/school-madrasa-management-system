export interface StudentLedgerLine {
    date: string
    type: 'Fee' | 'Payment'
    feeId: number
    serialNumber: string
    description: string
    gross: number
    discount: number
    debit: number
    credit: number
    balance: number
    discountStatus: string | null
}

export interface FamilyMember {
    studentId: number
    grNumber: string
    name: string
    class: string
    branchName: string
    isActive: boolean
    leftDate: string | null
    due: number
}

export interface StudentLedger {
    studentId: number
    grNumber: string
    name: string
    class: string
    branchName: string
    fatherName: string | null
    fatherCnic: string | null
    parentPhone: string | null
    isActive: boolean
    leftDate: string | null
    monthlyFee: number
    monthlyDiscount: number
    discountStatus: string | null
    totalGross: number
    totalDiscount: number
    totalCharged: number
    totalPaid: number
    balance: number
    unpaidCount: number
    pendingDiscountAmount: number
    lines: StudentLedgerLine[]
    family: FamilyMember[]
    familyDue: number
}

export interface ClassFeeSummaryRow {
    class: string
    activeStudents: number
    feeCount: number
    gross: number
    discount: number
    net: number
    received: number
    balance: number
    unpaidCount: number
}

export interface ClassFeeSummary {
    period: string
    branchName: string
    rows: ClassFeeSummaryRow[]
    total: ClassFeeSummaryRow
}

export interface LeftStudentDue {
    studentId: number
    grNumber: string
    name: string
    class: string
    branchName: string
    leftDate: string | null
    fatherName: string | null
    parentPhone: string | null
    unpaidCount: number
    due: number
    oldestDueDate: string | null
    activeSiblings: FamilyMember[]
}

export interface LeftStudentsDues {
    studentCount: number
    totalDue: number
    recoverableThroughSiblings: number
    recoverableAmount: number
    rows: LeftStudentDue[]
}
