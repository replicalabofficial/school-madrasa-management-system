import { apiClient } from './client'
import type { CreateJournalVoucherRequest, JournalVoucher } from '../types/journalVoucher'

export const journalVouchersApi = {
    getAll: async (dateFrom?: string, dateTo?: string): Promise<JournalVoucher[]> => {
        const params: Record<string, string> = {}
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        const { data } = await apiClient.get<JournalVoucher[]>('/journal-vouchers', { params })
        return data
    },

    create: async (payload: CreateJournalVoucherRequest): Promise<JournalVoucher> => {
        const { data } = await apiClient.post<JournalVoucher>('/journal-vouchers', payload)
        return data
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/journal-vouchers/${id}`)
    },
}