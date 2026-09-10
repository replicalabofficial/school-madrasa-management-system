using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IChartOfAccountService
{
    Task<List<ChartOfAccount>> GetAllAsync();

    Task<ChartOfAccount?> GetByIdAsync(int id);

    Task<ChartOfAccount> CreateAsync(ChartOfAccount account);

    Task<bool> UpdateAsync(ChartOfAccount account);

    Task<bool> SetActiveStatusAsync(int id, bool isActive);
}