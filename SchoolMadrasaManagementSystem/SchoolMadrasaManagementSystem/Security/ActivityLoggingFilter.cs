using Microsoft.AspNetCore.Mvc.Filters;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;
using System.Security.Claims;

namespace SchoolMadrasaManagementSystem.Security;

public class ActivityLoggingFilter : IAsyncActionFilter
{
    private static readonly string[] LoggedMethods = { "POST", "PUT", "PATCH", "DELETE" };

    private readonly IActivityLogService _activityLogService;

    public ActivityLoggingFilter(IActivityLogService activityLogService)
    {
        _activityLogService = activityLogService;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var executedContext = await next();

        var httpMethod = context.HttpContext.Request.Method;

        if (!LoggedMethods.Contains(httpMethod))
        {
            return;
        }

        var user = context.HttpContext.User;

        if (user.Identity is null || !user.Identity.IsAuthenticated)
        {
            return;
        }

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = user.FindFirstValue("FullName") ?? user.FindFirstValue(ClaimTypes.Name);

        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(userName))
        {
            return;
        }

        var statusCode = executedContext.HttpContext.Response.StatusCode;
        var isSuccess = statusCode is >= 200 and < 300;

        var controllerName = context.RouteData.Values["controller"]?.ToString() ?? "Unknown";

        var branchIdClaim = user.FindFirst("BranchId")?.Value;
        int? branchId = int.TryParse(branchIdClaim, out var parsedBranchId) ? parsedBranchId : null;

        try
        {
            await _activityLogService.CreateAsync(new ActivityLog
            {
                UserId = userId,
                UserName = userName,
                Action = $"{httpMethod} {controllerName}",
                Module = controllerName,
                BranchId = branchId,
                Status = isSuccess ? "Success" : "Failed",
            });
        }
        catch
        {
            // Logging kabhi bhi asal request ko fail nahi karni chahiye.
        }
    }
}