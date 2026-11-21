import { apiClient } from './client'
import type { FinancialEntry, FinancialEntryPayload } from '../types/incomeExpense'

export const expensesApi = {
    getAll: async (): Promise<FinancialEntry[]> => {
        const { data } = await apiClient.get<FinancialEntry[]>('/expenses')
        return data
    },
    create: async (payload: FinancialEntryPayload): Promise<FinancialEntry> => {
        const { data } = await apiClient.post<FinancialEntry>('/expenses', payload)
        return data
    },
    update: async (id: number, payload: FinancialEntryPayload): Promise<void> => {
        await apiClient.put(`/expenses/${id}`, payload)
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/expenses/${id}`)
    },
}