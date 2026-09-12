using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _context;

    public ExpenseService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Expense>> GetAllAsync()
    {
        return await _context.Expenses
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .OrderByDescending(x => x.Date)
            .ToListAsync();
    }

    public async Task<Expense?> GetByIdAsync(int id)
    {
        return await _context.Expenses
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<Expense> CreateAsync(Expense expense)
    {
        ValidateExpense(expense);

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x =>
                x.Id == expense.ChartOfAccountId);

        if (account is null)
        {
            throw new InvalidOperationException(
                "Selected account does not exist.");
        }

        if (!account.IsActive)
        {
            throw new InvalidOperationException(
                "Selected account is inactive.");
        }

        if (!string.Equals(
                account.AccountType,
                "Expenses",
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Selected account is not an Expense account.");
        }

        expense.Category = account.AccountDescription.Trim();

        _context.Expenses.Add(expense);

        await _context.SaveChangesAsync();

        return expense;
    }

    public async Task<bool> UpdateAsync(Expense expense)
    {
        ValidateExpense(expense);

        var existing = await _context.Expenses
            .FirstOrDefaultAsync(x => x.Id == expense.Id);

        if (existing is null)
        {
            return false;
        }

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x =>
                x.Id == expense.ChartOfAccountId);

        if (account is null)
        {
            throw new InvalidOperationException(
                "Selected account does not exist.");
        }

        if (!account.IsActive)
        {
            throw new InvalidOperationException(
                "Selected account is inactive.");
        }

        if (!string.Equals(
                account.AccountType,
                "Expenses",
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Selected account is not an Expense account.");
        }

        existing.Date = expense.Date;
        existing.ChartOfAccountId = expense.ChartOfAccountId;
        existing.Category = account.AccountDescription.Trim();
        existing.Amount = expense.Amount;
        existing.Description = expense.Description.Trim();
        existing.BranchId = expense.BranchId;
        existing.Notes = expense.Notes?.Trim();

        await _context.SaveChangesAsync();

        return true;
    }

    private static void ValidateExpense(Expense expense)
    {
        if (expense.ChartOfAccountId <= 0)
        {
            throw new ArgumentException(
                "Expense account is required.");
        }

        if (expense.Amount <= 0)
        {
            throw new ArgumentException(
                "Expense amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(expense.Description))
        {
            throw new ArgumentException(
                "Expense description is required.");
        }

        if (expense.BranchId <= 0)
        {
            throw new ArgumentException(
                "Branch is required.");
        }
    }
}