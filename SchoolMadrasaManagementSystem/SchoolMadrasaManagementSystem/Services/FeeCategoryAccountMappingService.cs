using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IFeeCategoryAccountMappingService
{
    Task<List<FeeCategoryAccountMapping>> GetAllAsync();
    Task<FeeCategoryAccountMapping> UpsertAsync(string category, int? branchId, int chartOfAccountId);
    Task<int?> ResolveAccountIdAsync(string category, int branchId);
}

public class FeeCategoryAccountMappingService : IFeeCategoryAccountMappingService
{
    private readonly AppDbContext _context;

    public FeeCategoryAccountMappingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<FeeCategoryAccountMapping>> GetAllAsync()
    {
        return await _context.FeeCategoryAccountMappings
            .Include(x => x.Branch)
            .Include(x => x.ChartOfAccount)
            .OrderBy(x => x.Category)
            .ToListAsync();
    }

    public async Task<FeeCategoryAccountMapping> UpsertAsync(string category, int? branchId, int chartOfAccountId)
    {
        var account = await _context.ChartOfAccounts.FirstOrDefaultAsync(x => x.Id == chartOfAccountId);
        if (account is null || !string.Equals(account.AccountType, "Income", StringComparison.Ordinal))
        {
            throw new ArgumentException("Selected account must be an Income account.");
        }

        var existing = await _context.FeeCategoryAccountMappings
            .FirstOrDefaultAsync(x => x.Category == category && x.BranchId == branchId);

        if (existing is null)
        {
            existing = new FeeCategoryAccountMapping { Category = category, BranchId = branchId };
            _context.FeeCategoryAccountMappings.Add(existing);
        }

        existing.ChartOfAccountId = chartOfAccountId;
        await _context.SaveChangesAsync();

        return await _context.FeeCategoryAccountMappings
            .Include(x => x.Branch)
            .Include(x => x.ChartOfAccount)
            .FirstAsync(x => x.Id == existing.Id);
    }

    public async Task<int?> ResolveAccountIdAsync(string category, int branchId)
    {
        var mapping = await _context.FeeCategoryAccountMappings
            .Where(x => x.Category == category && (x.BranchId == branchId || x.BranchId == null))
            .OrderByDescending(x => x.BranchId.HasValue)
            .FirstOrDefaultAsync();

        return mapping?.ChartOfAccountId;
    }
}