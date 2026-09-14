using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;

namespace SchoolMadrasaManagementSystem.Security;

public interface IBranchSecurityContext
{
    bool IsHeadOffice { get; }
    int? GetBranchId();
    int GetRequiredBranchId();
    void EnsureBranchAccess(int branchId);
}

public class BranchSecurityContext : IBranchSecurityContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public BranchSecurityContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsHeadOffice =>
        _httpContextAccessor.HttpContext?.User.IsInRole(Roles.HeadOfficeAdmin) ?? false;

    public int? GetBranchId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var branchClaim = user?.FindFirst("BranchId")?.Value;

        if (int.TryParse(branchClaim, out var branchId))
        {
            return branchId;
        }

        return null;
    }

    public int GetRequiredBranchId()
    {
        var branchId = GetBranchId();
        if (!branchId.HasValue)
        {
            throw new UnauthorizedAccessException("Branch context is required for this operation.");
        }

        return branchId.Value;
    }

    public void EnsureBranchAccess(int branchId)
    {
        if (IsHeadOffice) return;

        var currentBranchId = GetRequiredBranchId();
        if (currentBranchId != branchId)
        {
            throw new UnauthorizedAccessException("You do not have access to perform this operation for another branch.");
        }
    }
}

public static class BranchSecurityExtensions
{
    public static IQueryable<T> ApplyBranchFilter<T>(
        this IQueryable<T> query,
        IBranchSecurityContext securityContext,
        int? filterBranchId = null) where T : class
    {
        if (securityContext.IsHeadOffice)
        {
            if (filterBranchId.HasValue)
            {
                return query.Where(e => EF.Property<int>(e, "BranchId") == filterBranchId.Value);
            }
            return query;
        }

        var branchId = securityContext.GetRequiredBranchId();
        return query.Where(e => EF.Property<int>(e, "BranchId") == branchId);
    }
}