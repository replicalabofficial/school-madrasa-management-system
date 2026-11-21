using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IFeeService
{
    Task<List<Fee>> GetAllAsync();
    Task<Fee?> GetByIdAsync(int id);
    Task<Fee> CreateAsync(Fee fee);
    Task<bool> UpdateAsync(Fee fee);
    Task<bool> MarkPaidAsync(int feeId);
    Task<bool> MarkPendingAsync(int feeId);
    Task<bool> ApproveDiscountAsync(int feeId);
    Task<bool> DeleteAsync(int id);
}