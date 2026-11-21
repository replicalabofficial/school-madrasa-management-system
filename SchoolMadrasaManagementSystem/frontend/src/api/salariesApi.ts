import { apiClient } from './client'
import type { Salary, SalaryPayload, SalaryPaymentPayload, SalaryAdjustment, SalaryAdjustmentPayload } from '../types/salary'

export const salariesApi = {
    getAll: async (): Promise<Salary[]> => {
        const { data } = await apiClient.get<Salary[]>('/salaries')
        return data
    },
    create: async (payload: SalaryPayload): Promise<Salary> => {
        const { data } = await apiClient.post<Salary>('/salaries', payload)
        return data
    },
    update: async (id: number, payload: SalaryPayload): Promise<void> => {
        await apiClient.put(`/salaries/${id}`, payload)
    },
    makePayment: async (id: number, payload: SalaryPaymentPayload): Promise<void> => {
        await apiClient.post(`/salaries/${id}/payments`, payload)
    },
    getAdditional: async (): Promise<SalaryAdjustment[]> => {
        const { data } = await apiClient.get<SalaryAdjustment[]>('/salaries/additional')
        return data
    },
    createAdditional: async (payload: SalaryAdjustmentPayload): Promise<SalaryAdjustment> => {
        const { data } = await apiClient.post<SalaryAdjustment>('/salaries/additional', payload)
        return data
    },
}