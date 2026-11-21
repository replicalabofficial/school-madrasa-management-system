using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/reconciliation")]
[Authorize(Policy = "BranchAccess")]
[RequireModuleAccess(BranchModules.BankReconciliation)]
public class ReconciliationController : ControllerBase
{
    private readonly ILedgerService _ledgerService;
    private readonly IReconciliationService _reconciliationService;

    public ReconciliationController(ILedgerService ledgerService, IReconciliationService reconciliationService)
    {
        _ledgerService = ledgerService;
        _reconciliationService = reconciliationService;
    }

    [HttpGet("{chartOfAccountId:int}")]
    public async Task<ActionResult<List<LedgerEntryDto>>> GetEntries(
        int chartOfAccountId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        return Ok(await _ledgerService.GetLedgerAsync(chartOfAccountId, dateFrom, dateTo));
    }

    [HttpPost("toggle")]
    public async Task<IActionResult> Toggle([FromBody] ToggleReconciledRequest request)
    {
        try
        {
            var updated = await _reconciliationService.ToggleReconciledAsync(request.SourceType, request.SourceId, request.IsReconciled);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}

public class ToggleReconciledRequest
{
    public string SourceType { get; set; } = string.Empty;
    public int SourceId { get; set; }
    public bool IsReconciled { get; set; }
}