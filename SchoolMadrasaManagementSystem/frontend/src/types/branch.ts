export interface Branch {
    id: number
    name: string
    code: string
    address: string | null
    isActive: boolean
}

export interface CreateBranchRequest {
    name: string
    code: string
    address?: string | null
}

export interface UpdateBranchRequest {
    name: string
    code: string
    address?: string | null
    isActive: boolean
}