import { apiClient } from './client'
import type {
    ApplyFeeStructureRequest,
    ApplyFeeStructureResult,
    FeePostingListItem,
    FeePostingPreview,
    FeePostingRequest,
    FeeStructure,
    FeeStructurePayload,
} from '../types/feeSetup'

export const feeStructuresApi = {
    getAll: async (params?: { branchId?: number; session?: string }): Promise<FeeStructure[]> => {
        const { data } = await apiClient.get<FeeStructure[]>('/fee-structures', { params })
        return data
    },
    sessions: async (): Promise<string[]> => {
        const { data } = await apiClient.get<string[]>('/fee-structures/sessions')
        return data
    },
    // Latest session's fee for a class (null when not set up)
    lookup: async (branchId: number, className: string): Promise<FeeStructure | null> => {
        const res = await apiClient.get<FeeStructure | ''>('/fee-structures/lookup', { params: { branchId, className } })
        return res.status === 204 || !res.data ? null : res.data
    },
    create: async (payload: FeeStructurePayload): Promise<FeeStructure> => {
        const { data } = await apiClient.post<FeeStructure>('/fee-structures', payload)
        return data
    },
    update: async (id: number, payload: FeeStructurePayload): Promise<void> => {
        await apiClient.put(`/fee-structures/${id}`, payload)
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/fee-structures/${id}`)
    },
    apply: async (payload: ApplyFeeStructureRequest): Promise<ApplyFeeStructureResult> => {
        const { data } = await apiClient.post<ApplyFeeStructureResult>('/fee-structures/apply', payload)
        return data
    },
}

export const feePostingsApi = {
    getAll: async (branchId?: number): Promise<FeePostingListItem[]> => {
        const { data } = await apiClient.get<FeePostingListItem[]>('/fee-postings', { params: branchId ? { branchId } : undefined })
        return data
    },
    preview: async (payload: FeePostingRequest): Promise<FeePostingPreview> => {
        const { data } = await apiClient.post<FeePostingPreview>('/fee-postings/preview', payload)
        return data
    },
    post: async (payload: FeePostingRequest): Promise<FeePostingPreview> => {
        const { data } = await apiClient.post<FeePostingPreview>('/fee-postings', payload)
        return data
    },
    undo: async (id: number): Promise<{ removedFees: number }> => {
        const { data } = await apiClient.delete<{ removedFees: number }>(`/fee-postings/${id}`)
        return data
    },
}
