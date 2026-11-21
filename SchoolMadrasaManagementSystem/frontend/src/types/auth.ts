export type Role = 'HeadOfficeAdmin' | 'BranchAdmin' | 'BranchUser'

export interface LoginRequest {
    userName: string
    password: string
    branchCode?: string
}

export interface AuthUser {
    id: string
    userName: string
    fullName: string
    role: Role
    branchId: number | null
    enabledModules: string[]
}