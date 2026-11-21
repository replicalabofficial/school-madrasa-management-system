import { apiClient } from './client'
import type { SystemSetting, UpdateSystemSettingPayload } from '../types/settings'

export const settingsApi = {
    get: async (): Promise<SystemSetting> => {
        const { data } = await apiClient.get<SystemSetting>('/settings')
        return data
    },
    update: async (payload: UpdateSystemSettingPayload): Promise<SystemSetting> => {
        const { data } = await apiClient.put<SystemSetting>('/settings', payload)
        return data
    },
    initialize: async (): Promise<SystemSetting> => {
        const { data } = await apiClient.post<SystemSetting>('/settings/initialize')
        return data
    },

    uploadLogo: async (file: File): Promise<SystemSetting> => {
        const formData = new FormData()
        formData.append('file', file)
        const { data } = await apiClient.post<SystemSetting>('/settings/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },
}