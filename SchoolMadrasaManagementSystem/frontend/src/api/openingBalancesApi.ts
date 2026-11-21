import { apiClient } from './client'
import type { CreateOpeningBalanceRequest, OpeningBalance } from '../types/openingBalance'

export const openingBalancesApi = {
    getAll: async (branchId?: number): Promise<OpeningBalance[]> => {
        const { data } = await apiClient.get<OpeningBalance[]>('/opening-balances', {
            params: branchId ? { branchId } : undefined,
        })
        return data
    },

    create: async (payload: CreateOpeningBalanceRequest): Promise<OpeningBalance> => {
        const { data } = await apiClient.post<OpeningBalance>('/opening-balances', payload)
        return data
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/opening-balances/${id}`)
    },
}