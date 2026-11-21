import { apiClient } from './client'
import type { LedgerEntry } from '../types/ledger'

export const reconciliationApi = {
    getEntries: async (chartOfAccountId: number, dateFrom?: string, dateTo?: string): Promise<LedgerEntry[]> => {
        const params: Record<string, string> = {}
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        const { data } = await apiClient.get<LedgerEntry[]>(`/reconciliation/${chartOfAccountId}`, { params })
        return data
    },
    toggle: async (sourceType: string, sourceId: number, isReconciled: boolean): Promise<void> => {
        await apiClient.post('/reconciliation/toggle', { sourceType, sourceId, isReconciled })
    },
}