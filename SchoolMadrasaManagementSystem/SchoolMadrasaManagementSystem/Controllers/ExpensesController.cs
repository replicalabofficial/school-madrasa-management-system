using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/expenses")]
[RequireModuleAccess(BranchModules.Expenses)]
[Authorize(Policy = "BranchAccess")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _service;

    public ExpensesController(IExpenseService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<Expense>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Expense>> GetById(int id)
    {
        var expense = await _service.GetByIdAsync(id);
        if (expense is null) return NotFound();
        return Ok(expense);
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> Create([FromBody] ExpenseRequest request)
    {
        var expense = new Expense
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
            var created = await _service.CreateAsync(expense);
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
    public async Task<IActionResult> Update(int id, [FromBody] ExpenseRequest request)
    {
        var expense = new Expense
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
            var updated = await _service.UpdateAsync(expense);
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

public class ExpenseRequest
{
    public DateTime Date { get; set; }
    public int ChartOfAccountId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public string? Notes { get; set; }
    public int SourceAccountId { get; set; }
}