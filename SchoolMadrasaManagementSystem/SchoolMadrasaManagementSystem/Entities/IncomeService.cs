using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class IncomeService : IIncomeService
{
    private readonly AppDbContext _context;

    public IncomeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Income>> GetAllAsync()
    {
        return await _context.Income
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .OrderByDescending(x => x.Date)
            .ToListAsync();
    }

    public async Task<Income?> GetByIdAsync(int id)
    {
        return await _context.Income
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<Income> CreateAsync(Income income)
    {
        ValidateIncome(income);

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x =>
                x.Id == income.ChartOfAccountId);

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
                "Income",
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Selected account is not an Income account.");
        }

        income.Category = account.AccountDescription.Trim();

        _context.Income.Add(income);

        await _context.SaveChangesAsync();

        return income;
    }

    public async Task<bool> UpdateAsync(Income income)
    {
        ValidateIncome(income);

        var existing = await _context.Income
            .FirstOrDefaultAsync(x => x.Id == income.Id);

        if (existing is null)
        {
            return false;
        }

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x =>
                x.Id == income.ChartOfAccountId);

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
                "Income",
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Selected account is not an Income account.");
        }

        existing.Date = income.Date;
        existing.ChartOfAccountId = income.ChartOfAccountId;
        existing.Category = account.AccountDescription.Trim();
        existing.Amount = income.Amount;
        existing.Description = income.Description.Trim();
        existing.BranchId = income.BranchId;
        existing.Notes = income.Notes?.Trim();

        await _context.SaveChangesAsync();

        return true;
    }

    private static void ValidateIncome(Income income)
    {
        if (income.ChartOfAccountId <= 0)
        {
            throw new ArgumentException(
                "Income account is required.");
        }

        if (income.Amount <= 0)
        {
            throw new ArgumentException(
                "Income amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(income.Description))
        {
            throw new ArgumentException(
                "Income description is required.");
        }

        if (income.BranchId <= 0)
        {
            throw new ArgumentException(
                "Branch is required.");
        }
    }
}