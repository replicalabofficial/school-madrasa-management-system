using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Reports;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("income")]
    public async Task<IActionResult> GetIncomeReport([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetIncomeReportAsync(filter);
        return Ok(result);
    }

    [HttpGet("expense")]
    public async Task<IActionResult> GetExpenseReport([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetExpenseReportAsync(filter);
        return Ok(result);
    }

    [HttpGet("fees")]
    public async Task<IActionResult> GetFeeReport([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetFeeReportAsync(filter);
        return Ok(result);
    }

    [HttpGet("salaries")]
    public async Task<IActionResult> GetSalaryReport([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetSalaryReportAsync(filter);
        return Ok(result);
    }

    [HttpGet("branch-financial")]
    public async Task<IActionResult> GetBranchFinancialReport([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetBranchFinancialReportAsync(filter);
        return Ok(result);
    }

    [HttpGet("account-financial")]
    public async Task<IActionResult> GetAccountFinancialReport([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetAccountFinancialReportAsync(filter);
        return Ok(result);
    }

    [HttpGet("chart-of-accounts")]
    public async Task<IActionResult> GetChartOfAccountReport([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetChartOfAccountReportAsync(filter);
        return Ok(result);
    }

    [HttpGet("monthly-summary")]
    public async Task<IActionResult> GetMonthlyFinancialSummary([FromQuery] ReportFilter filter)
    {
        var result = await _reportService.GetMonthlyFinancialSummaryAsync(filter);
        return Ok(result);
    }
}