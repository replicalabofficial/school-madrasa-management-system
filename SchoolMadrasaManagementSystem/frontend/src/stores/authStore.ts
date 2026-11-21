import { create } from 'zustand'
import { authApi } from '../api/authApi'
import { setUnauthorizedHandler } from '../api/client'
import type { AuthUser, LoginRequest } from '../types/auth'
import type { ApiErrorPayload } from '../api/client'

interface AuthState {
    user: AuthUser | null
    isAuthenticated: boolean
    isInitializing: boolean
    isSubmitting: boolean
    error: string | null

    restoreSession: () => Promise<void>
    login: (payload: LoginRequest) => Promise<boolean>
    logout: () => Promise<void>
    clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    isSubmitting: false,
    error: null,

    restoreSession: async () => {
        try {
            const user = await authApi.me()
            set({ user, isAuthenticated: true, isInitializing: false })
        } catch {
            set({ user: null, isAuthenticated: false, isInitializing: false })
        }
    },

    login: async (payload) => {
        set({ isSubmitting: true, error: null })

        try {
            const user = await authApi.login(payload)
            set({ user, isAuthenticated: true, isSubmitting: false })
            return true
        } catch (err) {
            const apiError = err as ApiErrorPayload
            set({
                isSubmitting: false,
                error: apiError.message ?? 'Login failed.',
            })
            return false
        }
    },

    logout: async () => {
        try {
            await authApi.logout()
        } finally {
            set({ user: null, isAuthenticated: false })
        }
    },

    clearError: () => set({ error: null }),
}))

setUnauthorizedHandler(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
})