using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    public ExpenseService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<List<Expense>> GetAllAsync()
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        return await _context.Expenses
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .ApplyBranchFilter(userBranchId, isHeadOffice)
            .OrderByDescending(x => x.Date)
            .ToListAsync();
    }

    public async Task<Expense?> GetByIdAsync(int id)
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var expense = await _context.Expenses
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (expense == null) return null;

        // IDOR Check: Ensure non-HeadOffice users only view their own branch data
        if (!isHeadOffice && userBranchId != expense.BranchId)
        {
            return null;
        }

        return expense;
    }

    public async Task<Expense> CreateAsync(Expense expense)
    {
        ValidateExpense(expense);

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        // Enforce user's branch for non-HeadOffice users to prevent branch spoofing
        if (!isHeadOffice)
        {
            if (!userBranchId.HasValue)
            {
                throw new UnauthorizedAccessException("User is not assigned to any valid branch.");
            }
            expense.BranchId = userBranchId.Value;
        }

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == expense.ChartOfAccountId);

        if (account is null)
        {
            throw new InvalidOperationException("Selected account does not exist.");
        }

        if (!account.IsActive)
        {
            throw new InvalidOperationException("Selected account is inactive.");
        }

        if (!string.Equals(account.AccountType, "Expenses", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Selected account is not an Expense account.");
        }

        expense.Category = account.AccountDescription.Trim();

        if (!expense.SourceAccountId.HasValue)
        {
            throw new ArgumentException("Source account (Cash or Bank) is required.");
        }

        var sourceAccount = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == expense.SourceAccountId.Value);

        if (sourceAccount is null || !string.Equals(sourceAccount.AccountType, "Cash", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Selected source account must be a Cash or Bank account.");
        }

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        return expense;
    }

    public async Task<bool> UpdateAsync(Expense expense)
    {
        ValidateExpense(expense);

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var existing = await _context.Expenses
            .FirstOrDefaultAsync(x => x.Id == expense.Id);

        if (existing is null)
        {
            return false;
        }

        // IDOR Authorization Check
        existing.EnsureBranchAccess(userBranchId, isHeadOffice);

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == expense.ChartOfAccountId);

        if (account is null)
        {
            throw new InvalidOperationException("Selected account does not exist.");
        }

        if (!account.IsActive)
        {
            throw new InvalidOperationException("Selected account is inactive.");
        }

        if (!string.Equals(account.AccountType, "Expenses", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Selected account is not an Expense account.");
        }

        existing.Date = expense.Date;
        existing.ChartOfAccountId = expense.ChartOfAccountId;
        existing.Category = account.AccountDescription.Trim();

        if (!expense.SourceAccountId.HasValue)
        {
            throw new ArgumentException("Source account (Cash or Bank) is required.");
        }

        var sourceAccount = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == expense.SourceAccountId.Value);

        if (sourceAccount is null || !string.Equals(sourceAccount.AccountType, "Cash", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Selected source account must be a Cash or Bank account.");
        }

        existing.SourceAccountId = expense.SourceAccountId;
        existing.Amount = expense.Amount;
        existing.Description = expense.Description.Trim();

        // Prevent spoofing BranchId during update for non-HeadOffice users
        if (isHeadOffice)
        {
            existing.BranchId = expense.BranchId;
        }

        existing.Notes = expense.Notes?.Trim();

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var existing = await _context.Expenses.FirstOrDefaultAsync(x => x.Id == id);
        if (existing is null) return false;

        existing.EnsureBranchAccess(userBranchId, isHeadOffice);

        _context.Expenses.Remove(existing);
        await _context.SaveChangesAsync();
        return true;
    }

    private static void ValidateExpense(Expense expense)
    {
        if (expense.ChartOfAccountId <= 0)
        {
            throw new ArgumentException("Expense account is required.");
        }

        if (expense.Amount <= 0)
        {
            throw new ArgumentException("Expense amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(expense.Description))
        {
            throw new ArgumentException("Expense description is required.");
        }

        if (expense.BranchId <= 0)
        {
            throw new ArgumentException("Branch is required.");
        }
    }
}