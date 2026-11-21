import type { RouteObject } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { AuthLayout } from '../layouts/AuthLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { BranchesPage } from '../pages/branches/BranchesPage'
import { StudentsPage } from '../pages/students/StudentsPage'
import { StaffPage } from '../pages/staff/StaffPage'
import { FeesPage } from '../pages/fees/FeesPage'
import { IncomePage } from '../pages/income/IncomePage'
import { ExpensesPage } from '../pages/expenses/ExpensesPage'
import { ChartOfAccountsPage } from '../pages/chartOfAccounts/ChartOfAccountsPage'
import { SalariesPage } from '../pages/salaries/SalariesPage'
import { ActivityLogsPage } from '../pages/activityLogs/ActivityLogsPage'
import { UsersPage } from '../pages/users/UsersPage'
import { NotFoundPage } from '../pages/errors/NotFoundPage'
import { UnauthorizedPage } from '../pages/errors/UnauthorizedPage'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { ReportsPage } from '../pages/reports/ReportsPage'
import { VouchersPage } from '../pages/vouchers/VouchersPage'
import { GeneralLedgerPage } from '../pages/generalLedger/GeneralLedgerPage'
import { FeeStudentDetailPage } from '../pages/fees/FeeStudentDetailPage'
import { TrialBalancePage } from '../pages/trialBalance/TrialBalancePage'
import { BalanceSheetPage } from '../pages/balanceSheet/BalanceSheetPage'
import { AgedReceivablesPage } from '../pages/agedReceivables/AgedReceivablesPage'
import { BankReconciliationPage } from '../pages/reconciliation/BankReconciliationPage'
import { DiscountApprovalsPage } from '../pages/discountApprovals/DiscountApprovalsPage'
import { IncomeExpenseSummaryPage } from '../pages/incomeExpenseSummary/IncomeExpenseSummaryPage'
import { IncomeStatementPage } from '../pages/incomeStatement/IncomeStatementPage'
import { FeeCategoryAccountsPage } from '../pages/feeCategoryAccounts/FeeCategoryAccountsPage'
import { OpeningBalancesPage } from '../pages/openingBalances/OpeningBalancesPage'
import { JournalVouchersPage } from '../pages/journalVouchers/JournalVouchersPage'
import { PeriodClosingPage } from '../pages/periodClosing/PeriodClosingPage'
import { FeeSetupPage } from '../pages/feeSetup/FeeSetupPage'
import { FeePostingPage } from '../pages/feePosting/FeePostingPage'
import { StudentLedgerPage } from '../pages/feeReports/StudentLedgerPage'
import { ClassFeeSummaryPage } from '../pages/feeReports/ClassFeeSummaryPage'
import { LeftStudentsDuesPage } from '../pages/feeReports/LeftStudentsDuesPage'


export const routes: RouteObject[] = [
    {
        path: '/login',
        element: (
            <AuthLayout>
                <LoginPage />
            </AuthLayout>
        ),
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: '/',
                element: <AppShell />,
                children: [
                    { index: true, element: <DashboardPage /> },
                    { path: 'branches', element: <RoleRoute><BranchesPage /></RoleRoute> },
                    { path: 'students', element: <RoleRoute><StudentsPage /></RoleRoute> },
                    { path: 'staff', element: <RoleRoute><StaffPage /></RoleRoute> },
                    { path: 'fees', element: <RoleRoute><FeesPage /></RoleRoute> },
                    { path: 'fees/student/:studentId', element: <FeeStudentDetailPage /> },
                    { path: 'fee-setup', element: <RoleRoute><FeeSetupPage /></RoleRoute> },
                    { path: 'fee-posting', element: <RoleRoute><FeePostingPage /></RoleRoute> },
                    { path: 'fees/ledger/:studentId', element: <StudentLedgerPage /> },
                    { path: 'class-fee-summary', element: <RoleRoute><ClassFeeSummaryPage /></RoleRoute> },
                    { path: 'left-students-dues', element: <RoleRoute><LeftStudentsDuesPage /></RoleRoute> },
                    { path: 'income', element: <RoleRoute><IncomePage /></RoleRoute> },
                    { path: 'expenses', element: <RoleRoute><ExpensesPage /></RoleRoute> },
                    { path: 'chart-of-accounts', element: <RoleRoute><ChartOfAccountsPage /></RoleRoute> },
                    { path: 'salaries', element: <RoleRoute><SalariesPage /></RoleRoute> },
                    { path: 'reports', element: <RoleRoute><ReportsPage /></RoleRoute> },
                    { path: 'activity-logs', element: <RoleRoute><ActivityLogsPage /></RoleRoute> },
                    { path: 'vouchers', element: <VouchersPage /> },
                    { path: 'users', element: <RoleRoute><UsersPage /></RoleRoute> },
                    { path: 'settings', element: <RoleRoute><SettingsPage /></RoleRoute> },
                    { path: 'unauthorized', element: <UnauthorizedPage /> },
                    { path: '*', element: <NotFoundPage /> },
                    { path: 'general-ledger', element: <GeneralLedgerPage /> },
                    { path: 'aged-receivables', element: <AgedReceivablesPage /> },
                    { path: 'bank-reconciliation', element: <BankReconciliationPage /> },
                    { path: 'trial-balance', element: <RoleRoute><TrialBalancePage /></RoleRoute> },
                    { path: 'income-statement', element: <IncomeStatementPage /> },
                    { path: 'balance-sheet', element: <RoleRoute><BalanceSheetPage /></RoleRoute> },
                    { path: 'discount-approvals', element: <RoleRoute><DiscountApprovalsPage /></RoleRoute> },
                    { path: 'income-expense-summary', element: <IncomeExpenseSummaryPage /> },
                    { path: 'fee-category-accounts', element: <RoleRoute><FeeCategoryAccountsPage /></RoleRoute> },
                    { path: 'opening-balances', element: <RoleRoute><OpeningBalancesPage /></RoleRoute> },
                    { path: 'journal-vouchers', element: <RoleRoute><JournalVouchersPage /></RoleRoute> },
                    { path: 'period-closing', element: <RoleRoute><PeriodClosingPage /></RoleRoute> },
                ],
            },
        ],
    },
]