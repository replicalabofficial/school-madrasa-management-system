import type { Branch } from './branch'

export interface Staff {
    id: number
    name: string
    branchId: number
    branch: Branch | null
    designation: string
}

export interface StaffPayload {
    name: string
    branchId: number
    designation: string
}

export const STAFF_DESIGNATIONS = ['Coordinator', 'Teacher', 'Admin']