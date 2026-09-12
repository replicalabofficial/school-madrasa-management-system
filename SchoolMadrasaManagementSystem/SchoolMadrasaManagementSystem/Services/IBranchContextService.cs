namespace SchoolMadrasaManagementSystem.Services
{
    public interface IBranchContextService
    {
        Task<int?> GetCurrentBranchIdAsync();
        Task<bool> IsHeadOfficeAdminAsync();
    }
}