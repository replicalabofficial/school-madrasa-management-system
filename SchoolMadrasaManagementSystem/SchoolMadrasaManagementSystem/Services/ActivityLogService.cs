using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.ActivityLogs;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public class ActivityLogService : IActivityLogService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _securityContext;

    public ActivityLogService(AppDbContext context, IBranchSecurityContext securityContext)
    {
        _context = context;
        _securityContext = securityContext;
    }

    public async Task<List<ActivityLogDto>> GetAllAsync()
    {
        return await _context.ActivityLogs
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext)
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Select(x => new ActivityLogDto
            {
                Id = x.Id,
                UserId = x.UserId,
                UserName = x.UserName,
                Action = x.Action,
                Module = x.Module,
                Date = x.Date,
                Time = x.Time,
                BranchId = x.BranchId,
                BranchName = x.Branch != null ? x.Branch.Name : string.Empty,
                Status = x.Status
            })
            .ToListAsync();
    }

    public async Task<List<ActivityLogDto>> GetByBranchAsync(int branchId)
    {
        _securityContext.EnsureBranchAccess(branchId);

        return await _context.ActivityLogs
            .AsNoTracking()
            .Include(x => x.Branch)
            .Where(x => x.BranchId == branchId)
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Select(x => new ActivityLogDto
            {
                Id = x.Id,
                UserId = x.UserId,
                UserName = x.UserName,
                Action = x.Action,
                Module = x.Module,
                Date = x.Date,
                Time = x.Time,
                BranchId = x.BranchId,
                BranchName = x.Branch != null ? x.Branch.Name : string.Empty,
                Status = x.Status
            })
            .ToListAsync();
    }

    public async Task<List<ActivityLogDto>> GetByUserAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User ID is required.");
        }

        return await _context.ActivityLogs
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext)
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Select(x => new ActivityLogDto
            {
                Id = x.Id,
                UserId = x.UserId,
                UserName = x.UserName,
                Action = x.Action,
                Module = x.Module,
                Date = x.Date,
                Time = x.Time,
                BranchId = x.BranchId,
                BranchName = x.Branch != null ? x.Branch.Name : string.Empty,
                Status = x.Status
            })
            .ToListAsync();
    }

    public async Task<ActivityLogDto?> GetByIdAsync(int id)
    {
        var log = await _context.ActivityLogs
            .AsNoTracking()
            .Include(x => x.Branch)
            .Where(x => x.Id == id)
            .FirstOrDefaultAsync();

        if (log == null)
            return null;

        if (log.BranchId.HasValue)
        {
            _securityContext.EnsureBranchAccess(log.BranchId.Value);
        }

        return new ActivityLogDto
        {
            Id = log.Id,
            UserId = log.UserId,
            UserName = log.UserName,
            Action = log.Action,
            Module = log.Module,
            Date = log.Date,
            Time = log.Time,
            BranchId = log.BranchId,
            BranchName = log.Branch != null ? log.Branch.Name : string.Empty,
            Status = log.Status
        };
    }

    public async Task<ActivityLogDto> CreateAsync(ActivityLog activityLog)
    {
        ValidateActivityLog(activityLog);

        activityLog.UserId = activityLog.UserId.Trim();
        activityLog.UserName = activityLog.UserName.Trim();
        activityLog.Action = activityLog.Action.Trim();
        activityLog.Module = activityLog.Module.Trim();
        activityLog.Status = activityLog.Status.Trim();

        if (!activityLog.BranchId.HasValue && !_securityContext.IsHeadOffice)
        {
            activityLog.BranchId = _securityContext.GetRequiredBranchId();
        }

        if (activityLog.BranchId.HasValue)
        {
            _securityContext.EnsureBranchAccess(activityLog.BranchId.Value);

            bool branchExists = await _context.Branches
                .AnyAsync(x => x.Id == activityLog.BranchId.Value);

            if (!branchExists)
            {
                throw new InvalidOperationException("Selected branch does not exist.");
            }
        }

        if (activityLog.Date == default)
        {
            activityLog.Date = DateTime.UtcNow.Date;
        }

        if (activityLog.Time == default)
        {
            activityLog.Time = DateTime.UtcNow.TimeOfDay;
        }

        _context.ActivityLogs.Add(activityLog);
        await _context.SaveChangesAsync();

        return new ActivityLogDto
        {
            Id = activityLog.Id,
            UserId = activityLog.UserId,
            UserName = activityLog.UserName,
            Action = activityLog.Action,
            Module = activityLog.Module,
            Date = activityLog.Date,
            Time = activityLog.Time,
            BranchId = activityLog.BranchId,
            Status = activityLog.Status
        };
    }

    private static void ValidateActivityLog(ActivityLog activityLog)
    {
        if (activityLog == null)
        {
            throw new ArgumentNullException(nameof(activityLog));
        }

        if (string.IsNullOrWhiteSpace(activityLog.UserId))
        {
            throw new ArgumentException("User ID is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.UserName))
        {
            throw new ArgumentException("User Name is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.Action))
        {
            throw new ArgumentException("Action is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.Module))
        {
            throw new ArgumentException("Module is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.Status))
        {
            throw new ArgumentException("Status is required.");
        }

        if (!string.Equals(activityLog.Status, "Success", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(activityLog.Status, "Failed", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Status must be either Success or Failed.");
        }
    }
}