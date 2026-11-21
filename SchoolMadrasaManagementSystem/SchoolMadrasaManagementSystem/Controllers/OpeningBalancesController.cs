using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.OpeningBalances;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/opening-balances")]
[Authorize(Roles = Roles.HeadOfficeAdmin)]
public class OpeningBalancesController : ControllerBase
{
    private readonly IOpeningBalanceService _service;

    public OpeningBalancesController(IOpeningBalanceService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<OpeningBalanceDto>>> GetAll([FromQuery] int? branchId)
    {
        try
        {
            return Ok(await _service.GetAllAsync(branchId));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    public async Task<ActionResult<OpeningBalanceDto>> Create([FromBody] CreateOpeningBalanceDto request)
    {
        try
        {
            var created = await _service.CreateAsync(request);
            return Ok(created);
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
    }
}