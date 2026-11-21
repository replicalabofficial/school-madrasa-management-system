using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/fees")]
[RequireModuleAccess(BranchModules.Fees)]
[Authorize(Policy = "BranchAccess")]
public class FeesController : ControllerBase
{
    private readonly IFeeService _service;

    public FeesController(IFeeService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<Fee>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Fee>> GetById(int id)
    {
        try
        {
            var fee = await _service.GetByIdAsync(id);
            if (fee is null) return NotFound();
            return Ok(fee);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<ActionResult<Fee>> Create([FromBody] FeeRequest request)
    {
        var fee = new Fee
        {
            SerialNumber = request.SerialNumber,
            StudentId = request.StudentId,
            Category = request.Category,
            Amount = request.Amount,
            FeePeriod = request.FeePeriod,
            Date = request.Date,
            Status = request.Status,
            Notes = request.Notes,
            Description = request.Description,
            DiscountAmount = request.DiscountAmount,
        };

        try
        {
            var created = await _service.CreateAsync(fee);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] FeeRequest request)
    {
        var fee = new Fee
        {
            Id = id,
            SerialNumber = request.SerialNumber,
            StudentId = request.StudentId,
            Category = request.Category,
            Amount = request.Amount,
            FeePeriod = request.FeePeriod,
            Date = request.Date,
            Status = request.Status,
            Notes = request.Notes,
            Description = request.Description,
            DiscountAmount = request.DiscountAmount,
        };

        try
        {
            var updated = await _service.UpdateAsync(fee);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/mark-paid")]
    public async Task<IActionResult> MarkPaid(int id)
    {
        try
        {
            var updated = await _service.MarkPaidAsync(id);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/mark-pending")]
    public async Task<IActionResult> MarkPending(int id)
    {
        try
        {
            var updated = await _service.MarkPendingAsync(id);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/approve-discount")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<IActionResult> ApproveDiscount(int id)
    {
        try
        {
            var updated = await _service.ApproveDiscountAsync(id);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
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
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}

public class FeeRequest
{
    public string SerialNumber { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string FeePeriod { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Status { get; set; } = "Pending";
    public string? Notes { get; set; }
    public string? Description { get; set; }
    public decimal DiscountAmount { get; set; }
}