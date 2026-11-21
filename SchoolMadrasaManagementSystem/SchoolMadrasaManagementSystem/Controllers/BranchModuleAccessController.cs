using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/branch-module-access")]
[Authorize(Policy = "HeadOfficeOnly")]
public class BranchModuleAccessController : ControllerBase
{
    private readonly IBranchModuleAccessService _service;

    public BranchModuleAccessController(IBranchModuleAccessService service)
    {
        _service = service;
    }

    [HttpGet("{branchId:int}")]
    public async Task<ActionResult<Dictionary<string, bool>>> GetModuleStates(int branchId)
    {
        return Ok(await _service.GetModuleStatesAsync(branchId));
    }

    [HttpPut("{branchId:int}")]
    public async Task<IActionResult> SetModuleState(int branchId, [FromBody] SetModuleStateRequest request)
    {
        try
        {
            await _service.SetModuleStateAsync(branchId, request.ModuleKey, request.IsEnabled);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class SetModuleStateRequest
{
    public string ModuleKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}