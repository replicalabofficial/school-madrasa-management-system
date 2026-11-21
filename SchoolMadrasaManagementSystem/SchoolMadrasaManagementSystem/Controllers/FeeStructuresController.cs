using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.FeeSetup;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/fee-structures")]
[Authorize(Policy = "BranchAccess")]
public class FeeStructuresController : ControllerBase
{
    private readonly IFeeStructureService _service;

    public FeeStructuresController(IFeeStructureService service)
    {
        _service = service;
    }

    // Branches can view their own setup; Head Office sees all
    [HttpGet]
    public async Task<ActionResult<List<FeeStructure>>> GetAll([FromQuery] int? branchId, [FromQuery] string? session)
    {
        try { return Ok(await _service.GetAllAsync(branchId, session)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<List<string>>> Sessions()
    {
        try { return Ok(await _service.GetSessionsAsync()); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // Fee of a class (latest session) — used to fill a new student's fee
    [HttpGet("lookup")]
    public async Task<ActionResult<FeeStructure?>> Lookup([FromQuery] int branchId, [FromQuery] string className)
    {
        try
        {
            var row = await _service.LookupAsync(branchId, className);
            if (row is null) return NoContent();
            return Ok(row);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<ActionResult<FeeStructure>> Create([FromBody] FeeStructureRequest request)
    {
        try { return Ok(await _service.CreateAsync(request)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] FeeStructureRequest request)
    {
        try
        {
            var ok = await _service.UpdateAsync(id, request);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _service.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }

    // August: update every active student's monthly fee from a session's setup (Commit=false = preview)
    [HttpPost("apply")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<ActionResult<ApplyFeeStructureResultDto>> Apply([FromBody] ApplyFeeStructureRequest request)
    {
        try { return Ok(await _service.ApplyToStudentsAsync(request)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
