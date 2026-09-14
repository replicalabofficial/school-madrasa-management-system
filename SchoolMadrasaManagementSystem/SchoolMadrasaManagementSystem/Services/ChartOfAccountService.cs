using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class ChartOfAccountService : IChartOfAccountService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    private static readonly string[] AllowedAccountTypes =
    {
        "Cash",
        "Fixed Assets",
        "Accounts Receivable",
        "Inventory",
        "Accounts Payable",
        "Equity–Doesn't Close",
        "Equity–Retained Earnings",
        "Income",
        "Cost of Sales",
        "Expenses"
    };

    public ChartOfAccountService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<List<ChartOfAccount>> GetAllAsync()
    {
        return await _context.ChartOfAccounts
            .OrderBy(x => x.AccountId)
            .ToListAsync();
    }

    public async Task<ChartOfAccount?> GetByIdAsync(int id)
    {
        return await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<ChartOfAccount> CreateAsync(ChartOfAccount account)
    {
        if (!await _branchContextService.IsHeadOfficeAdminAsync())
        {
            throw new UnauthorizedAccessException("Only Head Office Admin is authorized to modify the Chart of Accounts.");
        }

        ValidateAccount(account);

        bool accountIdExists = await _context.ChartOfAccounts
            .AnyAsync(x => x.AccountId == account.AccountId);

        if (accountIdExists)
        {
            throw new InvalidOperationException("An account with this Account ID already exists.");
        }

        account.AccountId = account.AccountId.Trim();
        account.AccountDescription = account.AccountDescription.Trim();
        account.AccountType = account.AccountType.Trim();

        _context.ChartOfAccounts.Add(account);
        await _context.SaveChangesAsync();

        return account;
    }

    public async Task<bool> UpdateAsync(ChartOfAccount account)
    {
        if (!await _branchContextService.IsHeadOfficeAdminAsync())
        {
            throw new UnauthorizedAccessException("Only Head Office Admin is authorized to modify the Chart of Accounts.");
        }

        ValidateAccount(account);

        var existingAccount = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == account.Id);

        if (existingAccount is null)
        {
            return false;
        }

        bool duplicateAccountId = await _context.ChartOfAccounts
            .AnyAsync(x => x.AccountId == account.AccountId && x.Id != account.Id);

        if (duplicateAccountId)
        {
            throw new InvalidOperationException("An account with this Account ID already exists.");
        }

        existingAccount.AccountId = account.AccountId.Trim();
        existingAccount.AccountDescription = account.AccountDescription.Trim();
        existingAccount.AccountType = account.AccountType.Trim();
        existingAccount.IsActive = account.IsActive;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetActiveStatusAsync(int id, bool isActive)
    {
        if (!await _branchContextService.IsHeadOfficeAdminAsync())
        {
            throw new UnauthorizedAccessException("Only Head Office Admin is authorized to modify the Chart of Accounts.");
        }

        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.Id == id);

        if (account is null)
        {
            return false;
        }

        account.IsActive = isActive;
        await _context.SaveChangesAsync();

        return true;
    }

    private static void ValidateAccount(ChartOfAccount account)
    {
        if (string.IsNullOrWhiteSpace(account.AccountId))
        {
            throw new ArgumentException("Account ID is required.");
        }

        if (string.IsNullOrWhiteSpace(account.AccountDescription))
        {
            throw new ArgumentException("Account description is required.");
        }

        if (string.IsNullOrWhiteSpace(account.AccountType))
        {
            throw new ArgumentException("Account type is required.");
        }

        if (!AllowedAccountTypes.Contains(account.AccountType.Trim(), StringComparer.Ordinal))
        {
            throw new ArgumentException("Invalid account type.");
        }
    }
}