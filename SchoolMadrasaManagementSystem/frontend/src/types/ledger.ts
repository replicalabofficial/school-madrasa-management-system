export interface LedgerEntry {
    date: string
    description: string
    branchName: string
    debit: number
    credit: number
    runningBalance: number
    sourceType: string
    sourceId: number
    isReconciled: boolean
}