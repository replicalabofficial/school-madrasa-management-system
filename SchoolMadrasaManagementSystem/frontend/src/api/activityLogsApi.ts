import { apiClient } from './client'
import type { ActivityLog } from '../types/activityLog'

export const activityLogsApi = {
    getAll: async (): Promise<ActivityLog[]> => {
        const { data } = await apiClient.get<ActivityLog[]>('/activity-logs')
        return data
    },
}