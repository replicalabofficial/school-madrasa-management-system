using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/ledger")]
[Authorize(Policy = "BranchAccess")]
public class LedgerController : ControllerBase
{
    private readonly ILedgerService _service;

    public LedgerController(ILedgerService service)
    {
        _service = service;
    }

    [HttpGet("{chartOfAccountId:int}")]
    public async Task<ActionResult<List<LedgerEntryDto>>> GetLedger(
        int chartOfAccountId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        return Ok(await _service.GetLedgerAsync(chartOfAccountId, dateFrom, dateTo));
    }
    [HttpGet("general")]
    public async Task<ActionResult<List<LedgerEntryDto>>> GetGeneralLedger(
    [FromQuery] DateTime? dateFrom,
    [FromQuery] DateTime? dateTo)
    {
        return Ok(await _service.GetGeneralLedgerAsync(dateFrom, dateTo));
    }
}