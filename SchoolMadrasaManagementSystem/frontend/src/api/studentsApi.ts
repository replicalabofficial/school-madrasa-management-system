import { apiClient } from './client'
import type {
    Student,
    StudentImportResult,
    StudentImportRow,
    StudentPayload,
    StudentPromotionRequest,
} from '../types/student'

export const studentsApi = {
    getAll: async (): Promise<Student[]> => {
        const { data } = await apiClient.get<Student[]>('/students')
        return data
    },

    create: async (payload: StudentPayload): Promise<Student> => {
        const { data } = await apiClient.post<Student>('/students', payload)
        return data
    },

    update: async (id: number, payload: StudentPayload): Promise<void> => {
        await apiClient.put(`/students/${id}`, payload)
    },

    markLeft: async (id: number, leftDate: string): Promise<void> => {
        await apiClient.post(`/students/${id}/mark-left`, { leftDate })
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/students/${id}`)
    },

    // commit = false -> check only (preview); commit = true -> save valid rows
    importStudents: async (rows: StudentImportRow[], commit: boolean): Promise<StudentImportResult> => {
        const { data } = await apiClient.post<StudentImportResult>('/students/import', { rows, commit })
        return data
    },

    pendingDiscounts: async (): Promise<Student[]> => {
        const { data } = await apiClient.get<Student[]>('/students/pending-discounts')
        return data
    },

    approveDiscount: async (id: number): Promise<void> => {
        await apiClient.post(`/students/${id}/approve-discount`)
    },

    rejectDiscount: async (id: number): Promise<void> => {
        await apiClient.post(`/students/${id}/reject-discount`)
    },

    promote: async (payload: StudentPromotionRequest): Promise<{ updatedCount: number }> => {
        const { data } = await apiClient.post<{ updatedCount: number }>('/students/promote', payload)
        return data
    },
}