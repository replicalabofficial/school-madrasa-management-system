using Microsoft.AspNetCore.Http;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public class BranchContextService : IBranchContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public BranchContextService(
        IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Task<int?> GetCurrentBranchIdAsync()
    {
        var user = _httpContextAccessor.HttpContext?.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            return Task.FromResult<int?>(null);
        }

        var claim = user.FindFirst("BranchId");

        if (claim == null)
        {
            return Task.FromResult<int?>(null);
        }

        if (int.TryParse(claim.Value, out var branchId))
        {
            return Task.FromResult<int?>(branchId);
        }

        return Task.FromResult<int?>(null);
    }

    public Task<bool> IsHeadOfficeAdminAsync()
    {
        var user = _httpContextAccessor.HttpContext?.User;

        var result =
            user?.IsInRole(Roles.HeadOfficeAdmin) == true;

        return Task.FromResult(result);
    }
}