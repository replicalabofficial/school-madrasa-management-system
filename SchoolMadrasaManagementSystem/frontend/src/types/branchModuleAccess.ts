export const TOGGLEABLE_MODULES: { key: string; label: string }[] = [
    { key: 'Students', label: 'Students' },
    { key: 'Staff', label: 'Staff' },
    { key: 'Fees', label: 'Fees' },
    { key: 'Income', label: 'Income' },
    { key: 'Expenses', label: 'Expenses' },
    { key: 'Reports', label: 'Reports' },
    { key: 'ActivityLog', label: 'Activity Log' },
    { key: 'BankReconciliation', label: 'Bank Reconciliation' },
    { key: 'TrialBalance', label: 'Trial Balance' },
]

export type ModuleStates = Record<string, boolean>