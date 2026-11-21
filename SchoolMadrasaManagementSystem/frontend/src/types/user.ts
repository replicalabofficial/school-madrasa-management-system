export type UserRole = 'HeadOfficeAdmin' | 'BranchAdmin' | 'BranchUser'

export interface AppUser {
    id: string
    userName: string
    email: string
    fullName: string
    isActive: boolean
    branchId: number | null
    branchName: string | null
    role: UserRole
}

export interface CreateUserRequest {
    userName: string
    email: string
    fullName: string
    password: string
    role: UserRole
    branchId: number | null
}

export interface UpdateUserRequest {
    userName: string
    email: string
    fullName: string
    role: UserRole
    branchId: number | null
    isActive: boolean
}