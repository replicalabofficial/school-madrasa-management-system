using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/vouchers")]
[Authorize(Policy = "BranchAccess")]
public class VouchersController : ControllerBase
{
    private readonly IVoucherService _service;

    public VouchersController(IVoucherService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<Voucher>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpPost("from-expense/{expenseId:int}")]
    public async Task<ActionResult<Voucher>> GenerateFromExpense(int expenseId)
    {
        try
        {
            return Ok(await _service.GenerateFromExpenseAsync(expenseId));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("from-income/{incomeId:int}")]
    public async Task<ActionResult<Voucher>> GenerateFromIncome(int incomeId)
    {
        try
        {
            return Ok(await _service.GenerateFromIncomeAsync(incomeId));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/send")]
    public async Task<IActionResult> SendToHeadOffice(int id)
    {
        try
        {
            var sent = await _service.MarkSentToHeadOfficeAsync(id);
            if (!sent) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}