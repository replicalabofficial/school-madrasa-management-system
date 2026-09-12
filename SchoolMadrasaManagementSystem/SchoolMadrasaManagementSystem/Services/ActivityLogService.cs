using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.ActivityLogs;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class ActivityLogService : IActivityLogService
{
    private readonly AppDbContext _context;

    public ActivityLogService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ActivityLogDto>> GetAllAsync()
    {
        return await _context.ActivityLogs
            .AsNoTracking()
            .Include(x => x.Branch)
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
                BranchName = x.Branch != null
                    ? x.Branch.Name
                    : string.Empty,
                Status = x.Status
            })
            .ToListAsync();
    }

    public async Task<List<ActivityLogDto>> GetByBranchAsync(
        int branchId)
    {
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
                BranchName = x.Branch != null
                    ? x.Branch.Name
                    : string.Empty,
                Status = x.Status
            })
            .ToListAsync();
    }

    public async Task<List<ActivityLogDto>> GetByUserAsync(
        string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException(
                "User ID is required.");
        }

        return await _context.ActivityLogs
            .AsNoTracking()
            .Include(x => x.Branch)
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
                BranchName = x.Branch != null
                    ? x.Branch.Name
                    : string.Empty,
                Status = x.Status
            })
            .ToListAsync();
    }

    public async Task<ActivityLogDto?> GetByIdAsync(
        int id)
    {
        return await _context.ActivityLogs
            .AsNoTracking()
            .Include(x => x.Branch)
            .Where(x => x.Id == id)
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
                BranchName = x.Branch != null
                    ? x.Branch.Name
                    : string.Empty,
                Status = x.Status
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ActivityLogDto> CreateAsync(
        ActivityLog activityLog)
    {
        ValidateActivityLog(activityLog);

        activityLog.UserId = activityLog.UserId.Trim();
        activityLog.UserName = activityLog.UserName.Trim();
        activityLog.Action = activityLog.Action.Trim();
        activityLog.Module = activityLog.Module.Trim();
        activityLog.Status = activityLog.Status.Trim();

        if (activityLog.Date == default)
        {
            activityLog.Date = DateTime.UtcNow.Date;
        }

        if (activityLog.Time == default)
        {
            activityLog.Time = DateTime.UtcNow.TimeOfDay;
        }

        if (activityLog.BranchId.HasValue)
        {
            bool branchExists = await _context.Branches
                .AnyAsync(x =>
                    x.Id == activityLog.BranchId.Value);

            if (!branchExists)
            {
                throw new InvalidOperationException(
                    "Selected branch does not exist.");
            }
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

    private static void ValidateActivityLog(
        ActivityLog activityLog)
    {
        if (string.IsNullOrWhiteSpace(activityLog.UserId))
        {
            throw new ArgumentException(
                "User ID is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.UserName))
        {
            throw new ArgumentException(
                "User name is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.Action))
        {
            throw new ArgumentException(
                "Action is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.Module))
        {
            throw new ArgumentException(
                "Module is required.");
        }

        if (string.IsNullOrWhiteSpace(activityLog.Status))
        {
            throw new ArgumentException(
                "Status is required.");
        }

        if (!string.Equals(
                activityLog.Status,
                "Success",
                StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(
                activityLog.Status,
                "Failed",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                "Status must be either Success or Failed.");
        }
    }
}