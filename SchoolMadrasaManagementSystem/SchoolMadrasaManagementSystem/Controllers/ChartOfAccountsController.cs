using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/chart-of-accounts")]
[Authorize(Policy = "BranchAccess")]
public class ChartOfAccountsController : ControllerBase
{
    private readonly IChartOfAccountService _service;

    public ChartOfAccountsController(IChartOfAccountService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<ChartOfAccount>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ChartOfAccount>> GetById(int id)
    {
        var account = await _service.GetByIdAsync(id);
        if (account is null) return NotFound();
        return Ok(account);
    }

    [HttpPost]
    [Authorize(Policy = "HeadOfficeOnly")]
    public async Task<ActionResult<ChartOfAccount>> Create([FromBody] ChartOfAccountRequest request)
    {
        var account = new ChartOfAccount
        {
            AccountId = request.AccountId,
            AccountDescription = request.AccountDescription,
            AccountType = request.AccountType,
            BranchId = request.BranchId,
        };

        try
        {
            var created = await _service.CreateAsync(account);
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
    [Authorize(Policy = "HeadOfficeOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] ChartOfAccountRequest request)
    {
        var account = new ChartOfAccount
        {
            Id = id,
            AccountId = request.AccountId,
            AccountDescription = request.AccountDescription,
            AccountType = request.AccountType,
            IsActive = request.IsActive,
            BranchId = request.BranchId,
        };

        try
        {
            var updated = await _service.UpdateAsync(account);
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

    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = "HeadOfficeOnly")]
    public async Task<IActionResult> SetActiveStatus(int id, [FromBody] SetAccountStatusRequest request)
    {
        try
        {
            var updated = await _service.SetActiveStatusAsync(id, request.IsActive);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}

public class ChartOfAccountRequest
{
    public string AccountId { get; set; } = string.Empty;
    public string AccountDescription { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int? BranchId { get; set; }
}

public class SetAccountStatusRequest
{
    public bool IsActive { get; set; }
}