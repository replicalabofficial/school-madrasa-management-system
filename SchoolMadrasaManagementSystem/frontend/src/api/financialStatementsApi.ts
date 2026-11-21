import { apiClient } from './client'
import type { BalanceSheet, TrialBalanceRow, IncomeStatement } from '../types/financialStatements'

export const financialStatementsApi = {
    getTrialBalance: async (dateFrom?: string, dateTo?: string): Promise<TrialBalanceRow[]> => {
        const params: Record<string, string> = {}
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        const { data } = await apiClient.get<TrialBalanceRow[]>('/financial-statements/trial-balance', { params })
        return data
    },
    getBalanceSheet: async (asOfDate?: string): Promise<BalanceSheet> => {
        const params: Record<string, string> = {}
        if (asOfDate) params.asOfDate = asOfDate
        const { data } = await apiClient.get<BalanceSheet>('/financial-statements/balance-sheet', { params })
        return data
    },

    getIncomeStatement: async (dateFrom?: string, dateTo?: string): Promise<IncomeStatement> => {
        const params: Record<string, string> = {}
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        const { data } = await apiClient.get<IncomeStatement>('/financial-statements/income-statement', { params })
        return data
    },
}