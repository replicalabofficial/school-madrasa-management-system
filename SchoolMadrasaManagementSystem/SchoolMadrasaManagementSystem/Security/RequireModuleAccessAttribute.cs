using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Security;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireModuleAccessAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _moduleKey;

    public RequireModuleAccessAttribute(string moduleKey)
    {
        _moduleKey = moduleKey;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;

        if (user.IsInRole(Roles.HeadOfficeAdmin))
        {
            await next();
            return;
        }

        var branchIdClaim = user.FindFirst("BranchId")?.Value;

        if (string.IsNullOrEmpty(branchIdClaim) || !int.TryParse(branchIdClaim, out var branchId))
        {
            context.Result = new ForbidResult();
            return;
        }

        var moduleAccessService = context.HttpContext.RequestServices
            .GetRequiredService<IBranchModuleAccessService>();

        var enabledModules = await moduleAccessService.GetEnabledModulesAsync(branchId);

        if (!enabledModules.Contains(_moduleKey))
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}