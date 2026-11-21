using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;
using SchoolMadrasaManagementSystem.Students;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/students")]
[Authorize(Policy = "BranchAccess")]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _service;

    public StudentsController(IStudentService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<Student>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Student>> GetById(int id)
    {
        try
        {
            var student = await _service.GetByIdAsync(id);
            if (student is null) return NotFound();
            return Ok(student);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<ActionResult<Student>> Create([FromBody] StudentRequest request)
    {
        var student = new Student
        {
            Name = request.Name,
            Class = request.Class,
            BranchId = request.BranchId,
            GrNumber = request.GrNumber,
            FatherName = request.FatherName,
            FatherCnic = request.FatherCnic,
            ParentPhone = request.ParentPhone,
            AdmissionDate = request.AdmissionDate,
            MonthlyFee = request.MonthlyFee,
            MonthlyDiscount = request.MonthlyDiscount,
        };

        try
        {
            var created = await _service.CreateAsync(student);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Excel/CSV import — Commit = false: check only, Commit = true: save valid rows
    [HttpPost("import")]
    [RequestSizeLimit(5_000_000)]
    public async Task<ActionResult<StudentImportResultDto>> Import([FromBody] StudentImportRequest request)
    {
        try
        {
            return Ok(await _service.ImportAsync(request));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Class promotion / mark as passed out
    [HttpPost("promote")]
    public async Task<ActionResult<StudentPromotionResultDto>> Promote([FromBody] StudentPromotionRequest request)
    {
        try
        {
            return Ok(await _service.PromoteAsync(request));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] StudentRequest request)
    {
        var student = new Student
        {
            Id = id,
            Name = request.Name,
            Class = request.Class,
            BranchId = request.BranchId,
            GrNumber = request.GrNumber,
            FatherName = request.FatherName,
            FatherCnic = request.FatherCnic,
            ParentPhone = request.ParentPhone,
            AdmissionDate = request.AdmissionDate,
            MonthlyFee = request.MonthlyFee,
            MonthlyDiscount = request.MonthlyDiscount,
        };

        try
        {
            var updated = await _service.UpdateAsync(student);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/mark-left")]
    public async Task<IActionResult> MarkLeft(int id, [FromBody] MarkLeftRequest request)
    {
        try
        {
            var updated = await _service.MarkLeftAsync(id, request.LeftDate);
            if (!updated) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ---- Standing monthly discount approval (Head Office) ----

    [HttpGet("pending-discounts")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<ActionResult<List<Student>>> PendingDiscounts() => Ok(await _service.GetPendingDiscountsAsync());

    [HttpPost("{id:int}/approve-discount")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<IActionResult> ApproveDiscount(int id)
    {
        try
        {
            var ok = await _service.ApproveDiscountAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/reject-discount")]
    [Authorize(Roles = Roles.HeadOfficeAdmin)]
    public async Task<IActionResult> RejectDiscount(int id)
    {
        try
        {
            var ok = await _service.RejectDiscountAsync(id);
            if (!ok) return NotFound();
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
        catch (DbUpdateException)
        {
            return BadRequest(new { message = "This student cannot be deleted because they have related fee records." });
        }
    }
}

public class StudentRequest
{
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string? FatherName { get; set; }
    public string? FatherCnic { get; set; }
    public string? ParentPhone { get; set; }
    public DateTime? AdmissionDate { get; set; }
    public decimal MonthlyFee { get; set; }
    public decimal MonthlyDiscount { get; set; }
}

public class MarkLeftRequest
{
    public DateTime LeftDate { get; set; }
}