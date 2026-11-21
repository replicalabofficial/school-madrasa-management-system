import type { Role } from '../types/auth'

// Ye modules hamesha sirf HeadOfficeAdmin ko dikhti hain, chahe toggle kuch bhi ho.
export const headOfficeOnlyPaths: string[] = [
    '/branches',
    '/salaries',
    '/chart-of-accounts',
    '/users',
    '/settings',
    '/trial-balance',
    '/balance-sheet',
    '/discount-approvals',
    '/fee-category-accounts',
    '/opening-balances',
    '/journal-vouchers',
    '/period-closing',
    '/fee-setup',
]

// Toggleable modules: path -> module key (backend ke BranchModules se match hona chahiye)
export const toggleablePathModules: Record<string, string> = {
    '/students': 'Students',
    '/staff': 'Staff',
    '/fees': 'Fees',
    '/fee-posting': 'Fees',
    '/class-fee-summary': 'Fees',
    '/left-students-dues': 'Fees',
    '/income': 'Income',
    '/expenses': 'Expenses',
    '/reports': 'Reports',
    '/activity-logs': 'ActivityLog',
    '/bank-reconciliation': 'BankReconciliation',
}

export function canAccessPath(
    path: string,
    role: Role | undefined,
    enabledModules: string[] | undefined,
): boolean {
    if (!role) {
        return false
    }

    if (headOfficeOnlyPaths.includes(path)) {
        return role === 'HeadOfficeAdmin'
    }

    const moduleKey = toggleablePathModules[path]

    if (!moduleKey) {
        return true
    }

    if (role === 'HeadOfficeAdmin') {
        return true
    }

    return (enabledModules ?? []).includes(moduleKey)
}