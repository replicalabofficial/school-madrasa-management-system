import { apiClient } from './client'
import type { Branding } from '../types/branding'

export const brandingApi = {
    get: async (): Promise<Branding> => {
        const { data } = await apiClient.get<Branding>('/settings/branding')
        return data
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/branches/${id}`)
    },
}