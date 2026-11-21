using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Dashboard;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = "BranchAccess")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("head-office")]
    [Authorize(Policy = "HeadOfficeOnly")]
    public async Task<ActionResult<HeadOfficeDashboardDto>> GetHeadOfficeDashboard(
        [FromQuery] int? branchId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var filter = new DashboardFilter
        {
            BranchId = branchId,
            DateFrom = dateFrom,
            DateTo = dateTo,
        };

        try
        {
            var dashboard = await _dashboardService.GetHeadOfficeDashboardAsync(filter);
            return Ok(dashboard);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("branch/{branchId:int}")]
    public async Task<ActionResult<BranchDashboardDto>> GetBranchDashboard(
        int branchId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var filter = new DashboardFilter
        {
            DateFrom = dateFrom,
            DateTo = dateTo,
        };

        try
        {
            var dashboard = await _dashboardService.GetBranchDashboardAsync(branchId, filter);

            if (dashboard is null)
            {
                return NotFound();
            }

            return Ok(dashboard);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("admission-stats")]
    public async Task<ActionResult<StudentAdmissionStatsDto>> GetAdmissionStats()
    {
        return Ok(await _dashboardService.GetStudentAdmissionStatsAsync());
    }
}