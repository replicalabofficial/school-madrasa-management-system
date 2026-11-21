import { apiClient } from './client'
import type { AgedReceivableRow } from '../types/agingReport'

export const agingReportApi = {
    getAgedReceivables: async (): Promise<AgedReceivableRow[]> => {
        const { data } = await apiClient.get<AgedReceivableRow[]>('/aging-report/receivables')
        return data
    },
}