import { apiClient } from './client'
import type { LedgerEntry } from '../types/ledger'
import type { LedgerAccountOption, LedgerReport } from '../types/ledgerReport'

export const ledgerApi = {
    get: async (chartOfAccountId: number, dateFrom?: string, dateTo?: string): Promise<LedgerEntry[]> => {
        const params: Record<string, string> = {}
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        const { data } = await apiClient.get<LedgerEntry[]>(`/ledger/${chartOfAccountId}`, { params })
        return data
    },

    getGeneral: async (dateFrom?: string, dateTo?: string): Promise<LedgerEntry[]> => {
        const params: Record<string, string> = {}
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        const { data } = await apiClient.get<LedgerEntry[]>('/ledger/general', { params })
        return data
    },

    // Opening balance + entries + closing balance. No account = Cash (101)
    getReport: async (chartOfAccountId?: number, dateFrom?: string, dateTo?: string): Promise<LedgerReport> => {
        const params: Record<string, string | number> = {}
        if (chartOfAccountId) params.chartOfAccountId = chartOfAccountId
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        const { data } = await apiClient.get<LedgerReport>('/ledger-report', { params })
        return data
    },

    getAccounts: async (): Promise<LedgerAccountOption[]> => {
        const { data } = await apiClient.get<LedgerAccountOption[]>('/ledger-report/accounts')
        return data
    },
}