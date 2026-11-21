using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.JournalEntries;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/journal-vouchers")]
[Authorize(Roles = Roles.HeadOfficeAdmin)]
public class JournalVouchersController : ControllerBase
{
    private readonly IJournalEntryService _service;

    public JournalVouchersController(IJournalEntryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<JournalEntryDto>>> GetAll([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
    {
        try
        {
            return Ok(await _service.GetAllAsync(dateFrom, dateTo));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JournalEntryDto>> GetById(int id)
    {
        try
        {
            var entry = await _service.GetByIdAsync(id);
            return entry is null ? NotFound() : Ok(entry);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    public async Task<ActionResult<JournalEntryDto>> Create([FromBody] CreateJournalEntryDto request)
    {
        try
        {
            return Ok(await _service.CreateAsync(request));
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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
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