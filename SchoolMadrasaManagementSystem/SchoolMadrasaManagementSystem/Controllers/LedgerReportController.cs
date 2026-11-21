using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Ledger;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/ledger-report")]
[Authorize(Policy = "BranchAccess")]
public class LedgerReportController : ControllerBase
{
    private readonly ILedgerService _ledgerService;

    public LedgerReportController(ILedgerService ledgerService)
    {
        _ledgerService = ledgerService;
    }

    // GET api/ledger-report?chartOfAccountId=5&dateFrom=2026-10-01&dateTo=2026-10-31
    // No chartOfAccountId = Cash account (101)
    [HttpGet]
    public async Task<ActionResult<LedgerReportDto>> Get(
        [FromQuery] int? chartOfAccountId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        if (dateFrom.HasValue && dateTo.HasValue && dateFrom.Value.Date > dateTo.Value.Date)
        {
            return BadRequest(new { message = "'From' date must be before 'To' date." });
        }

        try
        {
            var report = await _ledgerService.GetLedgerReportAsync(chartOfAccountId, dateFrom, dateTo);
            return report is null ? NotFound(new { message = "Account not found." }) : Ok(report);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("accounts")]
    public async Task<ActionResult<List<LedgerAccountOptionDto>>> GetAccounts()
    {
        return Ok(await _ledgerService.GetLedgerAccountsAsync());
    }
}