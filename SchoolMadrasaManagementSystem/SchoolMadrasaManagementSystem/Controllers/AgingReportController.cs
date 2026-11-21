using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;
using static SchoolMadrasaManagementSystem.Entities.BalanceSheetDto;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/aging-report")]
[Authorize(Policy = "BranchAccess")]
public class AgingReportController : ControllerBase
{
    private readonly IAgingReportService _service;

    public AgingReportController(IAgingReportService service)
    {
        _service = service;
    }

    [HttpGet("receivables")]
    public async Task<ActionResult<List<AgedReceivableRowDto>>> GetAgedReceivables()
    {
        return Ok(await _service.GetAgedReceivablesAsync());
    }
}