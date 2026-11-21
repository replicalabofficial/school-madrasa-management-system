import { apiClient } from './client'
import type { FinancialEntry, FinancialEntryPayload } from '../types/incomeExpense'

export const incomeApi = {
    getAll: async (): Promise<FinancialEntry[]> => {
        const { data } = await apiClient.get<FinancialEntry[]>('/income')
        return data
    },
    create: async (payload: FinancialEntryPayload): Promise<FinancialEntry> => {
        const { data } = await apiClient.post<FinancialEntry>('/income', payload)
        return data
    },
    update: async (id: number, payload: FinancialEntryPayload): Promise<void> => {
        await apiClient.put(`/income/${id}`, payload)
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/income/${id}`)
    },
}