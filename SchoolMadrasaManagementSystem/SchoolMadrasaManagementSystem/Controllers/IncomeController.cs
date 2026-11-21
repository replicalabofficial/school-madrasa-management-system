using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/income")]
[RequireModuleAccess(BranchModules.Income)]
[Authorize(Policy = "BranchAccess")]
public class IncomeController : ControllerBase
{
    private readonly IIncomeService _service;

    public IncomeController(IIncomeService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<Income>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Income>> GetById(int id)
    {
        var income = await _service.GetByIdAsync(id);
        if (income is null) return NotFound();
        return Ok(income);
    }

    [HttpPost]
    public async Task<ActionResult<Income>> Create([FromBody] IncomeRequest request)
    {
        var income = new Income
        {
            Date = request.Date,
            ChartOfAccountId = request.ChartOfAccountId,
            Amount = request.Amount,
            Description = request.Description,
            BranchId = request.BranchId,
            Notes = request.Notes,
            SourceAccountId = request.SourceAccountId,
        };

        try
        {
            var created = await _service.CreateAsync(income);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] IncomeRequest request)
    {
        var income = new Income
        {
            Id = id,
            Date = request.Date,
            ChartOfAccountId = request.ChartOfAccountId,
            Amount = request.Amount,
            Description = request.Description,
            BranchId = request.BranchId,
            Notes = request.Notes,
            SourceAccountId = request.SourceAccountId,
        };

        try
        {
            var updated = await _service.UpdateAsync(income);
            if (!updated) return NotFound();
            return NoContent();
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
            if (!deleted) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}

public class IncomeRequest
{
    public DateTime Date { get; set; }
    public int ChartOfAccountId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public string? Notes { get; set; }
    public int SourceAccountId { get; set; }
}