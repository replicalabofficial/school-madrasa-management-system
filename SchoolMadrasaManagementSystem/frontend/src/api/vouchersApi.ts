import { apiClient } from './client'
import type { Voucher } from '../types/voucher'

export const vouchersApi = {
    getAll: async (): Promise<Voucher[]> => {
        const { data } = await apiClient.get<Voucher[]>('/vouchers')
        return data
    },
    generateFromExpense: async (expenseId: number): Promise<Voucher> => {
        const { data } = await apiClient.post<Voucher>(`/vouchers/from-expense/${expenseId}`)
        return data
    },
    generateFromIncome: async (incomeId: number): Promise<Voucher> => {
        const { data } = await apiClient.post<Voucher>(`/vouchers/from-income/${incomeId}`)
        return data
    },
    sendToHeadOffice: async (id: number): Promise<void> => {
        await apiClient.post(`/vouchers/${id}/send`)
    },
}