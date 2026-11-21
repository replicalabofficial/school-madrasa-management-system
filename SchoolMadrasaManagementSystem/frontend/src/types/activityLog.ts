export interface ActivityLog {
    id: number
    userId: string
    userName: string
    action: string
    module: string
    date: string
    time: string
    branchId: number | null
    branchName: string
    status: string
}