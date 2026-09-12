using SchoolMadrasaManagementSystem.ActivityLogs;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IActivityLogService
{
    Task<List<ActivityLogDto>> GetAllAsync();

    Task<List<ActivityLogDto>> GetByBranchAsync(
        int branchId);

    Task<List<ActivityLogDto>> GetByUserAsync(
        string userId);

    Task<ActivityLogDto?> GetByIdAsync(
        int id);

    Task<ActivityLogDto> CreateAsync(
        ActivityLog activityLog);
}