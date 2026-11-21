using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Policy = "BranchAccess")]
public class StaffController : ControllerBase
{
    private readonly IStaffService _service;

    public StaffController(IStaffService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<Staff>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Staff>> GetById(int id)
    {
        try
        {
            var staff = await _service.GetByIdAsync(id);
            if (staff is null) return NotFound();
            return Ok(staff);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<ActionResult<Staff>> Create([FromBody] StaffRequest request)
    {
        var staff = new Staff { Name = request.Name, BranchId = request.BranchId, Designation = request.Designation };

        try
        {
            var created = await _service.CreateAsync(staff);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] StaffRequest request)
    {
        var staff = new Staff { Id = id, Name = request.Name, BranchId = request.BranchId, Designation = request.Designation };

        try
        {
            var updated = await _service.UpdateAsync(staff);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
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
        catch (DbUpdateException)
        {
            return BadRequest(new { message = "This staff member cannot be deleted because they have related salary records." });
        }
    }
}

public class StaffRequest
{
    public string Name { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public string Designation { get; set; } = "Teacher";
}