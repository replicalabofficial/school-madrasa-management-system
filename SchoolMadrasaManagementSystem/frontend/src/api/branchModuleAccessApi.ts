import { apiClient } from './client'
import type { ModuleStates } from '../types/branchModuleAccess'

export const branchModuleAccessApi = {
    getStates: async (branchId: number): Promise<ModuleStates> => {
        const { data } = await apiClient.get<ModuleStates>(`/branch-module-access/${branchId}`)
        return data
    },
    setState: async (branchId: number, moduleKey: string, isEnabled: boolean): Promise<void> => {
        await apiClient.put(`/branch-module-access/${branchId}`, { moduleKey, isEnabled })
    },
}