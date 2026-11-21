using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.FeeSetup;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/fee-postings")]
[RequireModuleAccess(BranchModules.Fees)]
[Authorize(Policy = "BranchAccess")]
public class FeePostingsController : ControllerBase
{
    private readonly IFeePostingService _service;

    public FeePostingsController(IFeePostingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<FeePostingListItemDto>>> GetAll([FromQuery] int? branchId)
    {
        try { return Ok(await _service.GetAllAsync(branchId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // Check only — nothing is saved
    [HttpPost("preview")]
    public async Task<ActionResult<FeePostingPreviewDto>> Preview([FromBody] FeePostingRequest request)
    {
        try { return Ok(await _service.PreviewAsync(request)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost]
    public async Task<ActionResult<FeePostingPreviewDto>> Post([FromBody] FeePostingRequest request)
    {
        try { return Ok(await _service.PostAsync(request)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Undo(int id)
    {
        try
        {
            var removed = await _service.UndoAsync(id);
            if (removed < 0) return NotFound();
            return Ok(new { removedFees = removed });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
