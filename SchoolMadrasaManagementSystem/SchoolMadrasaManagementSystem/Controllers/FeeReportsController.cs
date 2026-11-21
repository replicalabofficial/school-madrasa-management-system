using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.FeeSetup;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/fee-reports")]
[RequireModuleAccess(BranchModules.Fees)]
[Authorize(Policy = "BranchAccess")]
public class FeeReportsController : ControllerBase
{
    private readonly IFeeReportService _service;

    public FeeReportsController(IFeeReportService service)
    {
        _service = service;
    }

    [HttpGet("student-ledger/{studentId:int}")]
    public async Task<ActionResult<StudentLedgerDto>> StudentLedger(int studentId)
    {
        try
        {
            var dto = await _service.GetStudentLedgerAsync(studentId);
            if (dto is null) return NotFound();
            return Ok(dto);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpGet("class-summary")]
    public async Task<ActionResult<ClassFeeSummaryDto>> ClassSummary([FromQuery] int? branchId, [FromQuery] int month, [FromQuery] int year, [FromQuery] string? category)
    {
        try { return Ok(await _service.GetClassSummaryAsync(branchId, month, year, category)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("left-students-dues")]
    public async Task<ActionResult<LeftStudentsDuesDto>> LeftStudentsDues([FromQuery] int? branchId)
    {
        try { return Ok(await _service.GetLeftStudentsDuesAsync(branchId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
