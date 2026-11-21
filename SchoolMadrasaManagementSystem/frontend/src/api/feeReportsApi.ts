import { apiClient } from './client'
import type { ClassFeeSummary, LeftStudentsDues, StudentLedger } from '../types/feeReports'

export const feeReportsApi = {
    studentLedger: async (studentId: number): Promise<StudentLedger> => {
        const { data } = await apiClient.get<StudentLedger>(`/fee-reports/student-ledger/${studentId}`)
        return data
    },
    classSummary: async (params: { branchId?: number; month: number; year: number; category?: string }): Promise<ClassFeeSummary> => {
        const { data } = await apiClient.get<ClassFeeSummary>('/fee-reports/class-summary', { params })
        return data
    },
    leftStudentsDues: async (branchId?: number): Promise<LeftStudentsDues> => {
        const { data } = await apiClient.get<LeftStudentsDues>('/fee-reports/left-students-dues', { params: branchId ? { branchId } : undefined })
        return data
    },
}
