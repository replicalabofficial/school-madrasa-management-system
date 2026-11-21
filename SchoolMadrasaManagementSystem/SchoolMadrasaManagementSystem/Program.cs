using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Components;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;
using SchoolMadrasaManagementSystem.Middleware;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);
var isDev = builder.Environment.IsDevelopment();

// Real client IP behind Nginx / proxy (needed for per-user rate limiting)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 2;

    // Cloud hosts (Render etc.) put their own proxies in front: trust them (env TrustProxies=true)
    if (string.Equals(builder.Configuration["TrustProxies"], "true", StringComparison.OrdinalIgnoreCase))
    {
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    }
});

// Cloud hosts give the database as a URL (postgres://user:pass@host:port/db) -> convert for Npgsql
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrWhiteSpace(databaseUrl) && databaseUrl.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);
    var dbPort = uri.Port > 0 ? uri.Port : 5432;
    builder.Configuration["ConnectionStrings:DefaultConnection"] =
        $"Host={uri.Host};Port={dbPort};Database={uri.AbsolutePath.TrimStart('/')};" +
        $"Username={Uri.UnescapeDataString(userInfo[0])};Password={Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? string.Empty)};" +
        "SSL Mode=Prefer;Trust Server Certificate=true";
}

// Rate Limiting (login brute-force protection) — per IP, not system-wide
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("LoginPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Controllers Support
builder.Services.AddScoped<ActivityLoggingFilter>();

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ActivityLoggingFilter>();
});
builder.Services.AddHttpContextAccessor();

// CORS — dev origins by default; production origins from appsettings "Cors:Origins"
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Database Configuration
// Production: set env var ConnectionStrings__DefaultConnection (do not keep password in appsettings.json)
// Period lock: blocks changes to entries dated on/before the lock date (all modules)
builder.Services.AddSingleton<PeriodLockInterceptor>();

builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
           .AddInterceptors(serviceProvider.GetRequiredService<PeriodLockInterceptor>()));

// Identity Configuration
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;

    options.User.RequireUniqueEmail = true;

    // Account lockout after repeated wrong passwords
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// Deactivated / role-changed / password-reset users are signed out within 1 minute
builder.Services.Configure<SecurityStampValidatorOptions>(o =>
    o.ValidationInterval = TimeSpan.FromMinutes(1));

// Auth cookie + API returns 401/403 instead of redirect
builder.Services.ConfigureApplicationCookie(options =>
{
    // Dev: frontend (5173) and API (7013) are different sites -> None.
    // Production: same domain behind Nginx -> Lax (protects against CSRF).
    options.Cookie.SameSite = isDev ? SameSiteMode.None : SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.HttpOnly = true;
    options.Cookie.Name = "efas.auth";

    // Session: 8 hours, renewed while the user is active (default was 14 days)
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;

    options.Events.OnRedirectToLogin = context =>
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);
        return Task.CompletedTask;
    };

    options.Events.OnRedirectToAccessDenied = context =>
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);
        return Task.CompletedTask;
    };
});

// Authentication & Authorization Services
builder.Services.AddAuthentication();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("HeadOfficeOnly", policy =>
        policy.RequireRole(Roles.HeadOfficeAdmin));

    options.AddPolicy("BranchAccess", policy =>
        policy.RequireRole(Roles.HeadOfficeAdmin, Roles.BranchAdmin, Roles.BranchUser));
});

// Register Application & Security Services
builder.Services.AddScoped<IBranchSecurityContext, BranchSecurityContext>();
builder.Services.AddScoped<IBranchContextService, BranchContextService>();

builder.Services.AddScoped<IChartOfAccountService, ChartOfAccountService>();
builder.Services.AddScoped<ISalaryService, SalaryService>();
builder.Services.AddScoped<ISalaryAdjustmentService, SalaryAdjustmentService>();
builder.Services.AddScoped<IIncomeService, IncomeService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ILedgerService, LedgerService>();
builder.Services.AddScoped<IVoucherService, VoucherService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
builder.Services.AddScoped<ISystemSettingService, SystemSettingService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

builder.Services.AddScoped<IBranchService, BranchService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IFeeService, FeeService>();
builder.Services.AddScoped<IBranchModuleAccessService, BranchModuleAccessService>();
builder.Services.AddScoped<IFinancialStatementService, FinancialStatementService>();
builder.Services.AddScoped<IReconciliationService, ReconciliationService>();
builder.Services.AddScoped<IAgingReportService, AgingReportService>();
builder.Services.AddScoped<IFeeCategoryAccountMappingService, FeeCategoryAccountMappingService>();
builder.Services.AddScoped<IOpeningBalanceService, OpeningBalanceService>();
builder.Services.AddScoped<IJournalEntryService, JournalEntryService>();
builder.Services.AddScoped<IPeriodClosingService, PeriodClosingService>();
builder.Services.AddScoped<IFeeStructureService, FeeStructureService>();
builder.Services.AddScoped<IFeePostingService, FeePostingService>();
builder.Services.AddScoped<IFeeReportService, FeeReportService>();

var app = builder.Build();

// Must be first: read real client IP / https from Nginx
app.UseForwardedHeaders();

app.UseMiddleware<PeriodLockExceptionMiddleware>();

// Seed Database Roles and Initial HeadOffice User
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    try
    {
        // Cloud demo: create/update tables automatically on start (env RunMigrations=true)
        if (string.Equals(builder.Configuration["RunMigrations"], "true", StringComparison.OrdinalIgnoreCase))
        {
            await services.GetRequiredService<AppDbContext>().Database.MigrateAsync();
        }

        await DbInitializer.SeedAsync(services);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

// Basic security headers
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("Frontend");

app.UseAntiforgery();

app.UseRateLimiter();

// Authentication & Authorization Middlewares
app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

// Map Blazor Components
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

// Map API Controllers
app.MapControllers();

app.Run();