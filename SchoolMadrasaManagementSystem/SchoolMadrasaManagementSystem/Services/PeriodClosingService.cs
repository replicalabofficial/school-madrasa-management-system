using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.JournalEntries;
using SchoolMadrasaManagementSystem.PeriodClosing;

namespace SchoolMadrasaManagementSystem.Services;

public interface IPeriodClosingService
{
    Task<PeriodLockDto> GetLockAsync();
    Task<PeriodLockDto> SetLockAsync(DateTime? lockedUpTo);
    Task<YearEndPreviewDto> PreviewYearEndAsync(DateTime yearEndDate);
    Task<JournalEntryDto> CloseYearAsync(CloseYearRequest request);
    Task<List<JournalEntryDto>> GetClosingsAsync();
    Task<bool> ReopenYearAsync(int journalEntryId);
}

public class PeriodClosingService : IPeriodClosingService
{
    private const string RetainedEarningsCode = "3910";
    private const string RetainedEarningsName = "Retained Earnings";
    private const string RetainedEarningsType = "Equity–Retained Earnings";

    private static readonly string[] IncomeTypes = { "Income" };
    private static readonly string[] ExpenseTypes = { "Expenses", "Cost of Sales" };

    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;
    private readonly ILedgerService _ledgerService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly UserManager<ApplicationUser> _userManager;

    public PeriodClosingService(
        AppDbContext context,
        IBranchContextService branchContextService,
        ILedgerService ledgerService,
        IHttpContextAccessor httpContextAccessor,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _branchContextService = branchContextService;
        _ledgerService = ledgerService;
        _httpContextAccessor = httpContextAccessor;
        _userManager = userManager;
    }

    private async Task EnsureHeadOfficeAsync()
    {
        if (!await _branchContextService.IsHeadOfficeAdminAsync())
        {
            throw new UnauthorizedAccessException("Period closing is restricted to Head Office.");
        }
    }

    private async Task<string> CurrentUserNameAsync()
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        if (principal is null) return string.Empty;
        var user = await _userManager.GetUserAsync(principal);
        return user?.FullName ?? principal.Identity?.Name ?? string.Empty;
    }

    // ---------- Period lock ----------

    public async Task<PeriodLockDto> GetLockAsync()
    {
        var row = await _context.AccountingPeriodLocks.AsNoTracking().FirstOrDefaultAsync();
        return row is null
            ? new PeriodLockDto()
            : new PeriodLockDto { LockedUpTo = row.LockedUpTo, UpdatedByName = row.UpdatedByName, UpdatedAt = row.UpdatedAt };
    }

    public async Task<PeriodLockDto> SetLockAsync(DateTime? lockedUpTo)
    {
        await EnsureHeadOfficeAsync();

        var row = await _context.AccountingPeriodLocks.FirstOrDefaultAsync();
        var userName = await CurrentUserNameAsync();

        if (!lockedUpTo.HasValue)
        {
            if (row != null)
            {
                _context.AccountingPeriodLocks.Remove(row);
                await _context.SaveChangesAsync();
            }

            return new PeriodLockDto();
        }

        if (lockedUpTo.Value.Date >= DateTime.Today)
        {
            throw new ArgumentException("You can only lock dates before today.");
        }

        if (row is null)
        {
            row = new AccountingPeriodLock();
            _context.AccountingPeriodLocks.Add(row);
        }

        row.LockedUpTo = lockedUpTo.Value.Date;
        row.UpdatedByName = userName;
        row.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PeriodLockDto { LockedUpTo = row.LockedUpTo, UpdatedByName = row.UpdatedByName, UpdatedAt = row.UpdatedAt };
    }

    // ---------- Year-end closing ----------

    private sealed record ClosingBalance(ChartOfAccount Account, int? BranchId, string BranchName, decimal Net);

    // Net (debit - credit) of every income/expense account per branch up to yearEndDate
    private async Task<List<ClosingBalance>> GetClosingBalancesAsync(DateTime yearEndDate)
    {
        var accounts = await _context.ChartOfAccounts
            .Where(a => IncomeTypes.Contains(a.AccountType) || ExpenseTypes.Contains(a.AccountType))
            .ToDictionaryAsync(a => a.Id);

        var branches = await _context.Branches.AsNoTracking().ToListAsync();
        var branchIdByName = branches
            .GroupBy(b => b.Name)
            .ToDictionary(g => g.Key, g => (int?)g.First().Id);

        var lines = await _ledgerService.GetJournalLinesAsync(null, yearEndDate);

        return lines
            .Where(l => accounts.ContainsKey(l.AccountId))
            .GroupBy(l => new { l.AccountId, l.BranchName })
            .Select(g => new ClosingBalance(
                accounts[g.Key.AccountId],
                branchIdByName.TryGetValue(g.Key.BranchName ?? string.Empty, out var id) ? id : null,
                g.Key.BranchName ?? string.Empty,
                g.Sum(l => l.Debit - l.Credit)))
            .Where(x => x.Net != 0)
            .OrderBy(x => x.Account.AccountId)
            .ThenBy(x => x.BranchName)
            .ToList();
    }

    public async Task<YearEndPreviewDto> PreviewYearEndAsync(DateTime yearEndDate)
    {
        await EnsureHeadOfficeAsync();

        var balances = await GetClosingBalancesAsync(yearEndDate.Date);

        var lines = balances.Select(b => new YearEndLineDto
        {
            AccountId = b.Account.AccountId,
            AccountDescription = b.Account.AccountDescription,
            AccountType = b.Account.AccountType,
            BranchName = string.IsNullOrEmpty(b.BranchName) ? "All / Institution" : b.BranchName,
            Amount = -b.Net, // income (credit balance) shows positive, expense negative
        }).ToList();

        var totalIncome = lines.Where(l => IncomeTypes.Contains(l.AccountType)).Sum(l => l.Amount);
        var totalExpenses = -lines.Where(l => ExpenseTypes.Contains(l.AccountType)).Sum(l => l.Amount);

        return new YearEndPreviewDto
        {
            YearEndDate = yearEndDate.Date,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            NetIncome = totalIncome - totalExpenses,
            Lines = lines,
        };
    }

    public async Task<JournalEntryDto> CloseYearAsync(CloseYearRequest request)
    {
        await EnsureHeadOfficeAsync();

        var yearEnd = request.YearEndDate.Date;

        if (request.YearEndDate == default)
        {
            throw new ArgumentException("Year-end date is required.");
        }

        if (yearEnd >= DateTime.Today)
        {
            throw new ArgumentException("You can only close a year that has already ended.");
        }

        var currentLock = await _context.AccountingPeriodLocks.AsNoTracking().FirstOrDefaultAsync();
        if (currentLock != null && currentLock.LockedUpTo.Date >= yearEnd)
        {
            throw new InvalidOperationException($"Books are already locked up to {currentLock.LockedUpTo:dd MMM yyyy}. Unlock first to close this year.");
        }

        var number = $"YE-{yearEnd:yyyy-MM-dd}";
        if (await _context.JournalEntries.AnyAsync(x => x.EntryNumber == number))
        {
            throw new InvalidOperationException("This year has already been closed.");
        }

        var balances = await GetClosingBalancesAsync(yearEnd);
        if (balances.Count == 0)
        {
            throw new InvalidOperationException("There is no income or expense to close for this period.");
        }

        var retainedEarnings = await EnsureRetainedEarningsAccountAsync();

        var entry = new JournalEntry
        {
            EntryNumber = number,
            Date = yearEnd,
            Description = $"Year-end closing {yearEnd:dd MMM yyyy}",
            EntryType = JournalEntryService.YearEndType,
            CreatedAt = DateTime.UtcNow,
            CreatedByName = await CurrentUserNameAsync(),
        };

        // Zero every income/expense balance, per branch
        foreach (var b in balances)
        {
            entry.Lines.Add(new JournalEntryLine
            {
                ChartOfAccountId = b.Account.Id,
                BranchId = b.BranchId,
                Debit = b.Net < 0 ? -b.Net : 0,
                Credit = b.Net > 0 ? b.Net : 0,
                Note = "Closing",
            });
        }

        // Balance each branch into Retained Earnings
        foreach (var group in entry.Lines.GroupBy(l => l.BranchId).ToList())
        {
            var difference = group.Sum(l => l.Debit) - group.Sum(l => l.Credit);
            if (difference == 0) continue;

            entry.Lines.Add(new JournalEntryLine
            {
                ChartOfAccountId = retainedEarnings.Id,
                BranchId = group.Key,
                Debit = difference < 0 ? -difference : 0,
                Credit = difference > 0 ? difference : 0,
                Note = difference > 0 ? "Surplus for the year" : "Deficit for the year",
            });
        }

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        if (request.LockBooks)
        {
            await SetLockAsync(yearEnd);
        }

        var saved = await _context.JournalEntries
            .AsNoTracking()
            .Include(x => x.Lines).ThenInclude(l => l.ChartOfAccount)
            .Include(x => x.Lines).ThenInclude(l => l.Branch)
            .FirstAsync(x => x.Id == entry.Id);

        return JournalEntryService.ToDto(saved);
    }

    public async Task<List<JournalEntryDto>> GetClosingsAsync()
    {
        await EnsureHeadOfficeAsync();

        var entries = await _context.JournalEntries
            .AsNoTracking()
            .Where(x => x.EntryType == JournalEntryService.YearEndType)
            .Include(x => x.Lines).ThenInclude(l => l.ChartOfAccount)
            .Include(x => x.Lines).ThenInclude(l => l.Branch)
            .OrderByDescending(x => x.Date)
            .ToListAsync();

        return entries.Select(JournalEntryService.ToDto).ToList();
    }

    public async Task<bool> ReopenYearAsync(int journalEntryId)
    {
        await EnsureHeadOfficeAsync();

        var entry = await _context.JournalEntries.FirstOrDefaultAsync(x =>
            x.Id == journalEntryId && x.EntryType == JournalEntryService.YearEndType);

        if (entry is null)
        {
            return false;
        }

        var currentLock = await _context.AccountingPeriodLocks.AsNoTracking().FirstOrDefaultAsync();
        if (currentLock != null && currentLock.LockedUpTo.Date >= entry.Date.Date)
        {
            throw new InvalidOperationException($"Books are locked up to {currentLock.LockedUpTo:dd MMM yyyy}. Move the lock date before {entry.Date:dd MMM yyyy} first.");
        }

        _context.JournalEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<ChartOfAccount> EnsureRetainedEarningsAccountAsync()
    {
        var existing = await _context.ChartOfAccounts.FirstOrDefaultAsync(a => a.AccountId == RetainedEarningsCode)
            ?? await _context.ChartOfAccounts.FirstOrDefaultAsync(a => a.AccountType == RetainedEarningsType);

        if (existing != null)
        {
            return existing;
        }

        var account = new ChartOfAccount
        {
            AccountId = RetainedEarningsCode,
            AccountDescription = RetainedEarningsName,
            AccountType = RetainedEarningsType,
            IsActive = true,
        };

        _context.ChartOfAccounts.Add(account);
        await _context.SaveChangesAsync();
        return account;
    }
}