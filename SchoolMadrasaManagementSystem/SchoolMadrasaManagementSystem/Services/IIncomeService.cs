using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IIncomeService
{
    Task<List<Income>> GetAllAsync();

    Task<Income?> GetByIdAsync(int id);

    Task<Income> CreateAsync(Income income);

    Task<bool> UpdateAsync(Income income);
}