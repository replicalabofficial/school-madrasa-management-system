using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.ActivityLogs;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/activity-logs")]
[RequireModuleAccess(BranchModules.ActivityLog)]
[Authorize(Policy = "BranchAccess")]
public class ActivityLogsController : ControllerBase
{
    private readonly IActivityLogService _service;

    public ActivityLogsController(IActivityLogService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<ActivityLogDto>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ActivityLogDto>> GetById(int id)
    {
        try
        {
            var log = await _service.GetByIdAsync(id);
            if (log is null) return NotFound();
            return Ok(log);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}