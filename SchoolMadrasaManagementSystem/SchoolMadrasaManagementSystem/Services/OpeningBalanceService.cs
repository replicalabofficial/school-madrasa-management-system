using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.OpeningBalances;

namespace SchoolMadrasaManagementSystem.Services;

public interface IOpeningBalanceService
{
    Task<List<OpeningBalanceDto>> GetAllAsync(int? branchId);
    Task<OpeningBalanceDto> CreateAsync(CreateOpeningBalanceDto request);
    Task<bool> DeleteAsync(int id);
}

public class OpeningBalanceService : IOpeningBalanceService
{
    // Balancing account for all opening balances (created automatically)
    public const string EquityAccountCode = "3900";
    private const string EquityAccountName = "Opening Balance Equity";
    private const string EquityAccountType = "Equity–Doesn't Close";

    // Opening balances are only for balance-sheet accounts
    private static readonly string[] NotAllowedTypes = { "Income", "Expenses", "Cost of Sales" };

    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    public OpeningBalanceService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    private async Task EnsureHeadOfficeAsync()
    {
        if (!await _branchContextService.IsHeadOfficeAdminAsync())
        {
            throw new UnauthorizedAccessException("Opening balances can only be managed by Head Office.");
        }
    }

    public async Task<List<OpeningBalanceDto>> GetAllAsync(int? branchId)
    {
        await EnsureHeadOfficeAsync();

        var query = _context.OpeningBalances
            .AsNoTracking()
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .AsQueryable();

        if (branchId.HasValue)
        {
            query = query.Where(x => x.BranchId == branchId.Value);
        }

        return await query
            .OrderBy(x => x.Branch.Name)
            .ThenBy(x => x.ChartOfAccount.AccountId)
            .Select(x => new OpeningBalanceDto
            {
                Id = x.Id,
                ChartOfAccountId = x.ChartOfAccountId,
                AccountId = x.ChartOfAccount.AccountId,
                AccountDescription = x.ChartOfAccount.AccountDescription,
                AccountType = x.ChartOfAccount.AccountType,
                BranchId = x.BranchId,
                BranchName = x.Branch.Name,
                EntryType = x.EntryType,
                Amount = x.Amount,
                Date = x.Date,
                Description = x.Description,
            })
            .ToListAsync();
    }

    public async Task<OpeningBalanceDto> CreateAsync(CreateOpeningBalanceDto request)
    {
        await EnsureHeadOfficeAsync();

        if (request.Amount <= 0)
        {
            throw new ArgumentException("Amount must be greater than zero.");
        }

        var entryType = request.EntryType?.Trim();
        if (entryType != "Debit" && entryType != "Credit")
        {
            throw new ArgumentException("Entry type must be Debit or Credit.");
        }

        if (request.Date == default)
        {
            throw new ArgumentException("Date is required.");
        }

        var account = await _context.ChartOfAccounts.FirstOrDefaultAsync(x => x.Id == request.ChartOfAccountId)
            ?? throw new ArgumentException("Selected account does not exist.");

        if (!account.IsActive)
        {
            throw new InvalidOperationException("Selected account is inactive.");
        }

        if (account.AccountId == EquityAccountCode)
        {
            throw new InvalidOperationException("Opening Balance Equity is filled automatically. Choose another account.");
        }

        if (NotAllowedTypes.Contains(account.AccountType))
        {
            throw new InvalidOperationException("Opening balances are only for Cash, Bank, Asset, Receivable, Liability and Equity accounts — not Income or Expense accounts.");
        }

        var branch = await _context.Branches.FirstOrDefaultAsync(x => x.Id == request.BranchId)
            ?? throw new ArgumentException("Selected branch does not exist.");

        var exists = await _context.OpeningBalances
            .AnyAsync(x => x.ChartOfAccountId == account.Id && x.BranchId == branch.Id);

        if (exists)
        {
            throw new InvalidOperationException("This account already has an opening balance for this branch. Delete it first to enter a new amount.");
        }

        await EnsureEquityAccountAsync();

        var entity = new OpeningBalance
        {
            ChartOfAccountId = account.Id,
            BranchId = branch.Id,
            EntryType = entryType,
            Amount = decimal.Round(request.Amount, 2),
            Date = request.Date.Date,
            Description = request.Description?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
        };

        _context.OpeningBalances.Add(entity);
        await _context.SaveChangesAsync();

        return new OpeningBalanceDto
        {
            Id = entity.Id,
            ChartOfAccountId = account.Id,
            AccountId = account.AccountId,
            AccountDescription = account.AccountDescription,
            AccountType = account.AccountType,
            BranchId = branch.Id,
            BranchName = branch.Name,
            EntryType = entity.EntryType,
            Amount = entity.Amount,
            Date = entity.Date,
            Description = entity.Description,
        };
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await EnsureHeadOfficeAsync();

        var entity = await _context.OpeningBalances.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
        {
            return false;
        }

        _context.OpeningBalances.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task EnsureEquityAccountAsync()
    {
        var exists = await _context.ChartOfAccounts.AnyAsync(x => x.AccountId == EquityAccountCode);
        if (exists)
        {
            return;
        }

        _context.ChartOfAccounts.Add(new ChartOfAccount
        {
            AccountId = EquityAccountCode,
            AccountDescription = EquityAccountName,
            AccountType = EquityAccountType,
            IsActive = true,
        });

        await _context.SaveChangesAsync();
    }
}