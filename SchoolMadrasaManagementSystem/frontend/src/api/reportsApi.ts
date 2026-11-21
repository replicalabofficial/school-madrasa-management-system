import { apiClient } from './client'
import type {
    AccountFinancialReportRow,
    BranchFinancialReportRow,
    ChartOfAccountReportRow,
    ExpenseReportRow,
    FeeReportRow,
    IncomeReportRow,
    MonthlyFinancialSummaryRow,
    ReportFilterParams,
    SalaryReportRow,
} from '../types/reports'

function toParams(filter: ReportFilterParams) {
    const params: Record<string, string | number> = {}
    if (filter.dateFrom) params.dateFrom = filter.dateFrom
    if (filter.dateTo) params.dateTo = filter.dateTo
    if (filter.branchId !== undefined) params.branchId = filter.branchId
    if (filter.accountType) params.accountType = filter.accountType
    if (filter.category) params.category = filter.category
    if (filter.status) params.status = filter.status
    return params
}

export const reportsApi = {
    getIncome: async (filter: ReportFilterParams): Promise<IncomeReportRow[]> => {
        const { data } = await apiClient.get<IncomeReportRow[]>('/reports/income', { params: toParams(filter) })
        return data
    },
    getExpense: async (filter: ReportFilterParams): Promise<ExpenseReportRow[]> => {
        const { data } = await apiClient.get<ExpenseReportRow[]>('/reports/expense', { params: toParams(filter) })
        return data
    },
    getFees: async (filter: ReportFilterParams): Promise<FeeReportRow[]> => {
        const { data } = await apiClient.get<FeeReportRow[]>('/reports/fees', { params: toParams(filter) })
        return data
    },
    getSalaries: async (filter: ReportFilterParams): Promise<SalaryReportRow[]> => {
        const { data } = await apiClient.get<SalaryReportRow[]>('/reports/salaries', { params: toParams(filter) })
        return data
    },
    getBranchFinancial: async (filter: ReportFilterParams): Promise<BranchFinancialReportRow[]> => {
        const { data } = await apiClient.get<BranchFinancialReportRow[]>('/reports/branch-financial', { params: toParams(filter) })
        return data
    },
    getAccountFinancial: async (filter: ReportFilterParams): Promise<AccountFinancialReportRow[]> => {
        const { data } = await apiClient.get<AccountFinancialReportRow[]>('/reports/account-financial', { params: toParams(filter) })
        return data
    },
    getChartOfAccounts: async (filter: ReportFilterParams): Promise<ChartOfAccountReportRow[]> => {
        const { data } = await apiClient.get<ChartOfAccountReportRow[]>('/reports/chart-of-accounts', { params: toParams(filter) })
        return data
    },
    getMonthlySummary: async (filter: ReportFilterParams): Promise<MonthlyFinancialSummaryRow[]> => {
        const { data } = await apiClient.get<MonthlyFinancialSummaryRow[]>('/reports/monthly-summary', { params: toParams(filter) })
        return data
    },
}