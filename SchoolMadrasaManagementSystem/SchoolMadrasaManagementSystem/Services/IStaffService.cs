using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IStaffService
{
    Task<List<Staff>> GetAllAsync();
    Task<Staff?> GetByIdAsync(int id);
    Task<Staff> CreateAsync(Staff staff);
    Task<bool> UpdateAsync(Staff staff);
    Task<bool> DeleteAsync(int id);
}