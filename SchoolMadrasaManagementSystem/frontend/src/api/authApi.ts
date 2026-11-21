import { apiClient } from './client'
import type { AuthUser, LoginRequest } from '../types/auth'

export const authApi = {
    login: async (payload: LoginRequest): Promise<AuthUser> => {
        const { data } = await apiClient.post<AuthUser>('/auth/login', payload)
        return data
    },

    me: async (): Promise<AuthUser> => {
        const { data } = await apiClient.get<AuthUser>('/auth/me')
        return data
    },

    logout: async (): Promise<void> => {
        await apiClient.post('/auth/logout')
    },
}