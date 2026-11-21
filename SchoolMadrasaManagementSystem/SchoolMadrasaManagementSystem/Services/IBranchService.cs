using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IBranchService
{
    Task<List<Branch>> GetAllAsync();

    Task<Branch?> GetByIdAsync(int id);

    Task<Branch> CreateAsync(Branch branch);

    Task<bool> UpdateAsync(Branch branch);

    Task<bool> SetActiveStatusAsync(int id, bool isActive);

    Task<bool> DeleteAsync(int id);
}