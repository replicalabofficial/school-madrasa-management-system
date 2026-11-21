import { apiClient } from './client'
import type { AppUser, CreateUserRequest, UpdateUserRequest } from '../types/user'

export const usersApi = {
    getAll: async (): Promise<AppUser[]> => {
        const { data } = await apiClient.get<AppUser[]>('/users')
        return data
    },

    create: async (payload: CreateUserRequest): Promise<AppUser> => {
        const { data } = await apiClient.post<AppUser>('/users', payload)
        return data
    },

    update: async (id: string, payload: UpdateUserRequest): Promise<void> => {
        await apiClient.put(`/users/${id}`, payload)
    },

    setActiveStatus: async (id: string, isActive: boolean): Promise<void> => {
        await apiClient.patch(`/users/${id}/status`, { isActive })
    },

    resetPassword: async (id: string, newPassword: string): Promise<void> => {
        await apiClient.post(`/users/${id}/reset-password`, { newPassword })
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/users/${id}`)
    },
}