export interface Voucher {
    id: number
    voucherNumber: string
    voucherType: string
    transactionId: number
    voucherDate: string
    branchId: number
    branch: { id: number; name: string; code: string } | null
    accountDescription: string
    description: string
    amount: number
    status: string
    sentAt: string | null
}