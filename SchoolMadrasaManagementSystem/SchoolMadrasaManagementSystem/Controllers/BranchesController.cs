using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/branches")]
[Authorize(Policy = "BranchAccess")]
public class BranchesController : ControllerBase
{
    private readonly IBranchService _service;

    public BranchesController(IBranchService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<Branch>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Branch>> GetById(int id)
    {
        var branch = await _service.GetByIdAsync(id);

        if (branch is null)
        {
            return NotFound();
        }

        return Ok(branch);
    }

    [HttpPost]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<ActionResult<Branch>> Create(
        [FromBody] Branch branch)
    {
        try
        {
            var created = await _service.CreateAsync(branch);

            return CreatedAtAction(
                nameof(GetById),
                new { id = created.Id },
                created);
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
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] Branch branch)
    {
        branch.Id = id;

        try
        {
            var updated = await _service.UpdateAsync(branch);

            if (!updated)
            {
                return NotFound();
            }

            return NoContent();
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
    [Authorize(Policy = "BranchAccess")]
    public async Task<IActionResult> SetStatus(
        int id,
        [FromBody] BranchStatusRequest request)
    {
        var updated = await _service.SetActiveStatusAsync(
            id,
            request.IsActive);

        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { message = "This branch cannot be deleted because it has related students, staff, or transaction records. Deactivate it instead." });
        }
    }
}

public class BranchStatusRequest
{
    public bool IsActive { get; set; }
}