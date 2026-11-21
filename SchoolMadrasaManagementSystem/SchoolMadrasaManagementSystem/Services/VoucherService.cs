using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IVoucherService
{
    Task<Voucher> GenerateFromExpenseAsync(int expenseId);
    Task<Voucher> GenerateFromIncomeAsync(int incomeId);
    Task<List<Voucher>> GetAllAsync();
    Task<bool> MarkSentToHeadOfficeAsync(int voucherId);
}

public class VoucherService : IVoucherService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    public VoucherService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<Voucher> GenerateFromExpenseAsync(int expenseId)
    {
        var expense = await _context.Expenses
            .Include(x => x.ChartOfAccount)
            .FirstOrDefaultAsync(x => x.Id == expenseId);

        if (expense is null) throw new InvalidOperationException("Expense not found.");

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();
        expense.EnsureBranchAccess(userBranchId, isHeadOffice);

        var existing = await _context.Vouchers
            .FirstOrDefaultAsync(x => x.VoucherType == "Expense" && x.TransactionId == expenseId);
        if (existing != null) return existing;

        var count = await _context.Vouchers.CountAsync(x => x.VoucherType == "Expense");

        var voucher = new Voucher
        {
            VoucherNumber = $"DV-{(count + 1):D5}",
            VoucherType = "Expense",
            TransactionId = expenseId,
            VoucherDate = expense.Date,
            BranchId = expense.BranchId,
            AccountDescription = expense.ChartOfAccount.AccountDescription,
            Description = expense.Description,
            Amount = expense.Amount,
            Status = "Draft",
        };

        _context.Vouchers.Add(voucher);
        await _context.SaveChangesAsync();
        return voucher;
    }

    public async Task<Voucher> GenerateFromIncomeAsync(int incomeId)
    {
        var income = await _context.Incomes
            .Include(x => x.ChartOfAccount)
            .FirstOrDefaultAsync(x => x.Id == incomeId);

        if (income is null) throw new InvalidOperationException("Income not found.");

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();
        income.EnsureBranchAccess(userBranchId, isHeadOffice);

        var existing = await _context.Vouchers
            .FirstOrDefaultAsync(x => x.VoucherType == "Income" && x.TransactionId == incomeId);
        if (existing != null) return existing;

        var count = await _context.Vouchers.CountAsync(x => x.VoucherType == "Income");

        var voucher = new Voucher
        {
            VoucherNumber = $"CV-{(count + 1):D5}",
            VoucherType = "Income",
            TransactionId = incomeId,
            VoucherDate = income.Date,
            BranchId = income.BranchId,
            AccountDescription = income.ChartOfAccount.AccountDescription,
            Description = income.Description,
            Amount = income.Amount,
            Status = "Draft",
        };

        _context.Vouchers.Add(voucher);
        await _context.SaveChangesAsync();
        return voucher;
    }

    public async Task<List<Voucher>> GetAllAsync()
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        return await _context.Vouchers
            .Include(x => x.Branch)
            .ApplyBranchFilter(userBranchId, isHeadOffice)
            .OrderByDescending(x => x.VoucherDate)
            .ToListAsync();
    }

    public async Task<bool> MarkSentToHeadOfficeAsync(int voucherId)
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var voucher = await _context.Vouchers.FirstOrDefaultAsync(x => x.Id == voucherId);
        if (voucher is null) return false;

        voucher.EnsureBranchAccess(userBranchId, isHeadOffice);
        voucher.Status = "SentToHeadOffice";
        voucher.SentAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }
}