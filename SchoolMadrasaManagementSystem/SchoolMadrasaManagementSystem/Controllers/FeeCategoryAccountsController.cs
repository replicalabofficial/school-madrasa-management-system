using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;
using SchoolMadrasaManagementSystem.Data;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/fee-category-accounts")]
[Authorize(Roles = Roles.HeadOfficeAdmin)]
public class FeeCategoryAccountsController : ControllerBase
{
    private readonly IFeeCategoryAccountMappingService _service;

    public FeeCategoryAccountsController(IFeeCategoryAccountMappingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<FeeCategoryAccountMapping>>> GetAll() => Ok(await _service.GetAllAsync());

    [HttpPost]
    public async Task<ActionResult<FeeCategoryAccountMapping>> Upsert([FromBody] FeeCategoryAccountRequest request)
    {
        try
        {
            var result = await _service.UpsertAsync(request.Category, request.BranchId, request.ChartOfAccountId);
            return Ok(result);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }
}

public class FeeCategoryAccountRequest
{
    public string Category { get; set; } = string.Empty;
    public int? BranchId { get; set; }
    public int ChartOfAccountId { get; set; }
}