using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.JournalEntries;
using SchoolMadrasaManagementSystem.PeriodClosing;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/period-closing")]
[Authorize(Roles = Roles.HeadOfficeAdmin)]
public class PeriodClosingController : ControllerBase
{
    private readonly IPeriodClosingService _service;

    public PeriodClosingController(IPeriodClosingService service)
    {
        _service = service;
    }

    [HttpGet("lock")]
    public async Task<ActionResult<PeriodLockDto>> GetLock()
    {
        return Ok(await _service.GetLockAsync());
    }

    [HttpPut("lock")]
    public async Task<ActionResult<PeriodLockDto>> SetLock([FromBody] SetPeriodLockRequest request)
    {
        try
        {
            return Ok(await _service.SetLockAsync(request.LockedUpTo));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("year-end/preview")]
    public async Task<ActionResult<YearEndPreviewDto>> Preview([FromQuery] DateTime yearEndDate)
    {
        if (yearEndDate == default)
        {
            return BadRequest(new { message = "Year-end date is required." });
        }

        try
        {
            return Ok(await _service.PreviewYearEndAsync(yearEndDate));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("year-end")]
    public async Task<ActionResult<JournalEntryDto>> CloseYear([FromBody] CloseYearRequest request)
    {
        try
        {
            return Ok(await _service.CloseYearAsync(request));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("year-end")]
    public async Task<ActionResult<List<JournalEntryDto>>> GetClosings()
    {
        try
        {
            return Ok(await _service.GetClosingsAsync());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("year-end/{id:int}")]
    public async Task<IActionResult> Reopen(int id)
    {
        try
        {
            var done = await _service.ReopenYearAsync(id);
            return done ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}