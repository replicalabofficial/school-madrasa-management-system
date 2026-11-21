using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface ISalaryAdjustmentService
{
    Task<List<SalaryAdjustment>> GetAllAsync();
    Task<SalaryAdjustment> CreateAsync(SalaryAdjustment adjustment);
}

public class SalaryAdjustmentService : ISalaryAdjustmentService
{
    private readonly AppDbContext _context;

    public SalaryAdjustmentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<SalaryAdjustment>> GetAllAsync()
    {
        return await _context.SalaryAdjustments
            .Include(x => x.Staff)
            .Include(x => x.ChartOfAccount)
            .Include(x => x.SourceAccount)
            .OrderByDescending(x => x.Date)
            .ToListAsync();
    }

    public async Task<SalaryAdjustment> CreateAsync(SalaryAdjustment adjustment)
    {
        if (adjustment.Amount <= 0)
            throw new ArgumentException("Amount must be greater than zero.");
        if (string.IsNullOrWhiteSpace(adjustment.Reason))
            throw new ArgumentException("Reason is required.");

        var staff = await _context.Staff.FirstOrDefaultAsync(x => x.Id == adjustment.StaffId);
        if (staff is null)
            throw new InvalidOperationException("Selected staff member does not exist.");

        var expenseAccount = await _context.ChartOfAccounts.FirstOrDefaultAsync(x => x.Id == adjustment.ChartOfAccountId);
        if (expenseAccount is null || !string.Equals(expenseAccount.AccountType, "Expenses", StringComparison.Ordinal))
            throw new ArgumentException("Selected account must be an Expense account.");

        var sourceAccount = await _context.ChartOfAccounts.FirstOrDefaultAsync(x => x.Id == adjustment.SourceAccountId);
        if (sourceAccount is null || !string.Equals(sourceAccount.AccountType, "Cash", StringComparison.Ordinal))
            throw new ArgumentException("Selected account must be a Cash or Bank account.");

        adjustment.BranchId = staff.BranchId;
        adjustment.Reason = adjustment.Reason.Trim();

        _context.SalaryAdjustments.Add(adjustment);
        await _context.SaveChangesAsync();

        return await _context.SalaryAdjustments
            .Include(x => x.Staff)
            .Include(x => x.ChartOfAccount)
            .Include(x => x.SourceAccount)
            .FirstAsync(x => x.Id == adjustment.Id);
    }
}