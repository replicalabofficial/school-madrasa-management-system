using SchoolMadrasaManagementSystem.Data;

namespace SchoolMadrasaManagementSystem.Middleware;

// Any module (Income, Expense, Fee, Salary, JV, Opening Balance) that hits a locked
// period gets a clear 400 message instead of a 500 "Something went wrong".
public class PeriodLockExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public PeriodLockExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (PeriodLockedException ex) when (!context.Response.HasStarted)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { message = ex.Message });
        }
    }
}