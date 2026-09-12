using SchoolMadrasaManagementSystem.Reports;

namespace SchoolMadrasaManagementSystem.Services;

public interface IReportService
{
    Task<List<IncomeReportDto>> GetIncomeReportAsync(
        ReportFilter filter);

    Task<List<ExpenseReportDto>> GetExpenseReportAsync(
        ReportFilter filter);

    Task<List<FeeReportDto>> GetFeeReportAsync(
        ReportFilter filter);

    Task<List<SalaryReportDto>> GetSalaryReportAsync(
        ReportFilter filter);

    Task<List<BranchFinancialReportDto>>
        GetBranchFinancialReportAsync(
            ReportFilter filter);

    Task<List<AccountFinancialReportDto>>
        GetAccountFinancialReportAsync(
            ReportFilter filter);

    Task<List<ChartOfAccountReportDto>>
        GetChartOfAccountReportAsync(
            ReportFilter filter);

    Task<List<MonthlyFinancialSummaryDto>>
        GetMonthlyFinancialSummaryAsync(
            ReportFilter filter);
}