using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;
using static SchoolMadrasaManagementSystem.Entities.BalanceSheetDto;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/financial-statements")]
[Authorize(Policy = "BranchAccess")]
public class FinancialStatementsController : ControllerBase
{
    private readonly IFinancialStatementService _service;

    public FinancialStatementsController(IFinancialStatementService service)
    {
        _service = service;
    }

    [HttpGet("trial-balance")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<ActionResult<List<TrialBalanceRowDto>>> GetTrialBalance(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        return Ok(await _service.GetTrialBalanceAsync(dateFrom, dateTo));
    }

    [HttpGet("balance-sheet")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<ActionResult<BalanceSheetDto>> GetBalanceSheet([FromQuery] DateTime? asOfDate)
    {
        return Ok(await _service.GetBalanceSheetAsync(asOfDate));
    }

    [HttpGet("income-statement")]
    public async Task<ActionResult<IncomeStatementDto>> GetIncomeStatement(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        return Ok(await _service.GetIncomeStatementAsync(dateFrom, dateTo));
    }
}