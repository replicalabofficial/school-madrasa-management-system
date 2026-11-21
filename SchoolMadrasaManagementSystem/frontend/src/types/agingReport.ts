export interface AgedReceivableRow {
    feeId: number
    serialNumber: string
    studentName: string
    branchName: string
    feePeriod: string
    amount: number
    daysOutstanding: number
    agingBucket: string
}