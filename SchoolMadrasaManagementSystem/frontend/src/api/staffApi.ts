import { apiClient } from './client'
import type { Staff, StaffPayload } from '../types/staff'

export const staffApi = {
    getAll: async (): Promise<Staff[]> => {
        const { data } = await apiClient.get<Staff[]>('/staff')
        return data
    },
    create: async (payload: StaffPayload): Promise<Staff> => {
        const { data } = await apiClient.post<Staff>('/staff', payload)
        return data
    },
    update: async (id: number, payload: StaffPayload): Promise<void> => {
        await apiClient.put(`/staff/${id}`, payload)
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/staff/${id}`)
    },
}