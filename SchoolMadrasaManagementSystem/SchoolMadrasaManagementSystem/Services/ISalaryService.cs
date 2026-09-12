using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface ISalaryService
{
    Task<List<Salary>> GetAllAsync();

    Task<Salary?> GetByIdAsync(int id);

    Task<Salary> CreateAsync(Salary salary);

    Task<bool> UpdateAsync(Salary salary);

    Task<bool> MakePaymentAsync(
        int salaryId,
        decimal paymentAmount,
        DateTime paymentDate);
}