import { apiClient } from './client'
import type { JournalVoucher } from '../types/journalVoucher'
import type { CloseYearRequest, PeriodLock, YearEndPreview } from '../types/periodClosing'

export const periodClosingApi = {
    getLock: async (): Promise<PeriodLock> => {
        const { data } = await apiClient.get<PeriodLock>('/period-closing/lock')
        return data
    },

    setLock: async (lockedUpTo: string | null): Promise<PeriodLock> => {
        const { data } = await apiClient.put<PeriodLock>('/period-closing/lock', { lockedUpTo })
        return data
    },

    previewYearEnd: async (yearEndDate: string): Promise<YearEndPreview> => {
        const { data } = await apiClient.get<YearEndPreview>('/period-closing/year-end/preview', { params: { yearEndDate } })
        return data
    },

    closeYear: async (payload: CloseYearRequest): Promise<JournalVoucher> => {
        const { data } = await apiClient.post<JournalVoucher>('/period-closing/year-end', payload)
        return data
    },

    getClosings: async (): Promise<JournalVoucher[]> => {
        const { data } = await apiClient.get<JournalVoucher[]>('/period-closing/year-end')
        return data
    },

    reopenYear: async (id: number): Promise<void> => {
        await apiClient.delete(`/period-closing/year-end/${id}`)
    },
}