import { apiClient } from './client'
import type {
    Branch,
    CreateBranchRequest,
    UpdateBranchRequest,
} from '../types/branch'

export const branchesApi = {
    getAll: async (): Promise<Branch[]> => {
        const { data } = await apiClient.get<Branch[]>('/branches')
        return data
    },

    create: async (payload: CreateBranchRequest): Promise<Branch> => {
        const { data } = await apiClient.post<Branch>('/branches', payload)
        return data
    },

    update: async (id: number, payload: UpdateBranchRequest): Promise<void> => {
        await apiClient.put(`/branches/${id}`, payload)
    },

    setActiveStatus: async (id: number, isActive: boolean): Promise<void> => {
        await apiClient.patch(`/branches/${id}/status`, { isActive })
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/branches/${id}`)
    },
}