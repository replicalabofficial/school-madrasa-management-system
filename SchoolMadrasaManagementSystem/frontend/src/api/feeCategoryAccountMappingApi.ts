import { apiClient } from './client'
import type { FeeCategoryAccountMapping } from '../types/feeCategoryAccountMapping'

export const feeCategoryAccountMappingApi = {
    getAll: async (): Promise<FeeCategoryAccountMapping[]> => {
        const { data } = await apiClient.get<FeeCategoryAccountMapping[]>('/fee-category-accounts')
        return data
    },
    upsert: async (payload: { category: string; branchId: number | null; chartOfAccountId: number }): Promise<FeeCategoryAccountMapping> => {
        const { data } = await apiClient.post<FeeCategoryAccountMapping>('/fee-category-accounts', payload)
        return data
    },
}