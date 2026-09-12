using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IExpenseService
{
    Task<List<Expense>> GetAllAsync();

    Task<Expense?> GetByIdAsync(int id);

    Task<Expense> CreateAsync(Expense expense);

    Task<bool> UpdateAsync(Expense expense);
}