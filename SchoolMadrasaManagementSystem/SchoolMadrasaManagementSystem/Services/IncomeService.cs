using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class IncomeService : IIncomeService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    public IncomeService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<List<Income>> GetAllAsync()
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        return await _context.Incomes
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .ApplyBranchFilter(userBranchId, isHeadOffice)
            .OrderByDescending(x => x.Date)
            .ToListAsync();
    }

    public async Task<Income?> GetByIdAsync(int id)
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var income = await _context.Incomes
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (income == null) return null;

        if (!isHeadOffice && userBranchId != income.BranchId)
        {
            return null;
        }

        return income;
    }

    public async Task<Income> CreateAsync(Income income)
    {
        ValidateIncome(income);

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        if (!isHeadOffice)
        {
            if (!userBranchId.HasValue)
            {
                throw new UnauthorizedAccessException("User is not assigned to any valid branch.");
            }
            income.BranchId = userBranchId.Value;
        }

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == income.ChartOfAccountId);

        if (account is null)
        {
            throw new InvalidOperationException("Selected account does not exist.");
        }

        if (!account.IsActive)
        {
            throw new InvalidOperationException("Selected account is inactive.");
        }

        if (!string.Equals(account.AccountType, "Income", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Selected account is not an Income account.");
        }

        income.Category = account.AccountDescription.Trim();

        _context.Incomes.Add(income);
        await _context.SaveChangesAsync();

        return income;
    }

    public async Task<bool> UpdateAsync(Income income)
    {
        ValidateIncome(income);

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var existing = await _context.Incomes
            .FirstOrDefaultAsync(x => x.Id == income.Id);

        if (existing is null)
        {
            return false;
        }

        existing.EnsureBranchAccess(userBranchId, isHeadOffice);

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == income.ChartOfAccountId);

        if (account is null)
        {
            throw new InvalidOperationException("Selected account does not exist.");
        }

        if (!account.IsActive)
        {
            throw new InvalidOperationException("Selected account is inactive.");
        }

        if (!string.Equals(account.AccountType, "Income", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Selected account is not an Income account.");
        }

        existing.Date = income.Date;
        existing.ChartOfAccountId = income.ChartOfAccountId;
        existing.Category = account.AccountDescription.Trim();
        existing.Amount = income.Amount;
        existing.Description = income.Description.Trim();

        if (isHeadOffice)
        {
            existing.BranchId = income.BranchId;
        }

        existing.Notes = income.Notes?.Trim();

        await _context.SaveChangesAsync();
        return true;
    }

    private static void ValidateIncome(Income income)
    {
        if (income.ChartOfAccountId <= 0)
        {
            throw new ArgumentException("Income account is required.");
        }

        if (income.Amount <= 0)
        {
            throw new ArgumentException("Income amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(income.Description))
        {
            throw new ArgumentException("Income description is required.");
        }

        if (income.BranchId <= 0)
        {
            throw new ArgumentException("Branch is required.");
        }
    }
}