import { apiClient } from './client'
import type { Fee, FeePayload } from '../types/fee'

export const feesApi = {
    getAll: async (): Promise<Fee[]> => {
        const { data } = await apiClient.get<Fee[]>('/fees')
        return data
    },
    create: async (payload: FeePayload): Promise<Fee> => {
        const { data } = await apiClient.post<Fee>('/fees', payload)
        return data
    },
    update: async (id: number, payload: FeePayload): Promise<void> => {
        await apiClient.put(`/fees/${id}`, payload)
    },

    markPaid: async (id: number): Promise<void> => {
        await apiClient.post(`/fees/${id}/mark-paid`)
    },

    markPending: async (id: number): Promise<void> => {
        await apiClient.post(`/fees/${id}/mark-pending`)
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/fees/${id}`)
    },
    approveDiscount: async (id: number): Promise<void> => {
        await apiClient.post(`/fees/${id}/approve-discount`)
    },
}
