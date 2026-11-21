import { apiClient } from './client'
import type { ChartOfAccount, ChartOfAccountPayload } from '../types/chartOfAccount'

export const chartOfAccountsApi = {
    getAll: async (): Promise<ChartOfAccount[]> => {
        const { data } = await apiClient.get<ChartOfAccount[]>('/chart-of-accounts')
        return data
    },
    create: async (payload: ChartOfAccountPayload): Promise<ChartOfAccount> => {
        const { data } = await apiClient.post<ChartOfAccount>('/chart-of-accounts', payload)
        return data
    },
    update: async (id: number, payload: ChartOfAccountPayload): Promise<void> => {
        await apiClient.put(`/chart-of-accounts/${id}`, payload)
    },
    setActiveStatus: async (id: number, isActive: boolean): Promise<void> => {
        await apiClient.patch(`/chart-of-accounts/${id}/status`, { isActive })
    },
}