using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/salaries")]
[Authorize(Roles = Roles.HeadOfficeAdmin)]
public class SalariesController : ControllerBase
{
    private readonly ISalaryService _service;
    private readonly ISalaryAdjustmentService _adjustmentService;

    public SalariesController(ISalaryService service, ISalaryAdjustmentService adjustmentService)
    {
        _service = service;
        _adjustmentService = adjustmentService;
    }

    [HttpGet]
    public async Task<ActionResult<List<Salary>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Salary>> GetById(int id)
    {
        var salary = await _service.GetByIdAsync(id);
        if (salary is null) return NotFound();
        return Ok(salary);
    }

    [HttpPost]
    public async Task<ActionResult<Salary>> Create([FromBody] SalaryRequest request)
    {
        var salary = new Salary
        {
            StaffId = request.StaffId,
            SalaryMonth = request.SalaryMonth,
            BasicSalary = request.BasicSalary,
            Allowances = request.Allowances,
            Deductions = request.Deductions,
            Notes = request.Notes,
        };

        try
        {
            var created = await _service.CreateAsync(salary);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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
    public async Task<IActionResult> Update(int id, [FromBody] SalaryRequest request)
    {
        var salary = new Salary
        {
            Id = id,
            StaffId = request.StaffId,
            SalaryMonth = request.SalaryMonth,
            BasicSalary = request.BasicSalary,
            Allowances = request.Allowances,
            Deductions = request.Deductions,
            Notes = request.Notes,
        };

        try
        {
            var updated = await _service.UpdateAsync(salary);
            if (!updated) return NotFound();
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

    [HttpPost("{id:int}/payments")]
    public async Task<IActionResult> MakePayment(int id, [FromBody] SalaryPaymentRequest request)
    {
        try
        {
            var updated = await _service.MakePaymentAsync(
                id, request.PaymentAmount, request.PaymentDate,
                request.ChartOfAccountId, request.SourceAccountId);
            if (!updated) return NotFound();
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

    [HttpGet("additional")]
    public async Task<ActionResult<List<SalaryAdjustment>>> GetAdditional()
    {
        return Ok(await _adjustmentService.GetAllAsync());
    }

    [HttpPost("additional")]
    public async Task<ActionResult<SalaryAdjustment>> CreateAdditional([FromBody] AdditionalSalaryRequest request)
    {
        var adjustment = new SalaryAdjustment
        {
            StaffId = request.StaffId,
            Amount = request.Amount,
            Date = request.Date,
            Reason = request.Reason,
            ChartOfAccountId = request.ChartOfAccountId,
            SourceAccountId = request.SourceAccountId,
        };

        try
        {
            var created = await _adjustmentService.CreateAsync(adjustment);
            return Ok(created);
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
}

public class SalaryRequest
{
    public int StaffId { get; set; }
    public string SalaryMonth { get; set; } = string.Empty;
    public decimal BasicSalary { get; set; }
    public decimal Allowances { get; set; }
    public decimal Deductions { get; set; }
    public string? Notes { get; set; }
}

public class SalaryPaymentRequest
{
    public decimal PaymentAmount { get; set; }
    public DateTime PaymentDate { get; set; }
    public int ChartOfAccountId { get; set; }
    public int SourceAccountId { get; set; }
}

public class AdditionalSalaryRequest
{
    public int StaffId { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int ChartOfAccountId { get; set; }
    public int SourceAccountId { get; set; }
}