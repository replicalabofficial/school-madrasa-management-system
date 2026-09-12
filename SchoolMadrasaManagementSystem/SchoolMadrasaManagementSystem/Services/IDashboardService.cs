using SchoolMadrasaManagementSystem.Dashboard;

namespace SchoolMadrasaManagementSystem.Services;

public interface IDashboardService
{
    Task<HeadOfficeDashboardDto> GetHeadOfficeDashboardAsync(
        DashboardFilter filter);

    Task<BranchDashboardDto?> GetBranchDashboardAsync(
        int branchId,
        DashboardFilter filter);
}