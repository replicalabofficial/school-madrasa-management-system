import { apiClient } from './client'
import type {
    BranchDashboard,
    DashboardFilter,
    HeadOfficeDashboard,
} from '../types/dashboard'

function toQueryParams(filter?: DashboardFilter) {
    const params: Record<string, string | number> = {}

    if (filter?.branchId !== undefined) params.branchId = filter.branchId
    if (filter?.dateFrom) params.dateFrom = filter.dateFrom
    if (filter?.dateTo) params.dateTo = filter.dateTo

    return params
}

export const dashboardApi = {
    getHeadOffice: async (filter?: DashboardFilter): Promise<HeadOfficeDashboard> => {
        const { data } = await apiClient.get<HeadOfficeDashboard>('/dashboard/head-office', {
            params: toQueryParams(filter),
        })
        return data
    },

    getBranch: async (
        branchId: number,
        filter?: DashboardFilter,
    ): Promise<BranchDashboard> => {
        const { data } = await apiClient.get<BranchDashboard>(
            `/dashboard/branch/${branchId}`,
            { params: toQueryParams(filter) },
        )
        return data
    },
}