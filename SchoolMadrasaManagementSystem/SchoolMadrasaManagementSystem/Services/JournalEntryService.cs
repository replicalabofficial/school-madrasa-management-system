using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.JournalEntries;

namespace SchoolMadrasaManagementSystem.Services;

public interface IJournalEntryService
{
    Task<List<JournalEntryDto>> GetAllAsync(DateTime? dateFrom, DateTime? dateTo);
    Task<JournalEntryDto?> GetByIdAsync(int id);
    Task<JournalEntryDto> CreateAsync(CreateJournalEntryDto request);
    Task<bool> DeleteAsync(int id);
}

public class JournalEntryService : IJournalEntryService
{
    public const string ManualType = "Manual";
    public const string YearEndType = "YearEndClosing";

    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly UserManager<ApplicationUser> _userManager;

    public JournalEntryService(
        AppDbContext context,
        IBranchContextService branchContextService,
        IHttpContextAccessor httpContextAccessor,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _branchContextService = branchContextService;
        _httpContextAccessor = httpContextAccessor;
        _userManager = userManager;
    }

    private async Task EnsureHeadOfficeAsync()
    {
        if (!await _branchContextService.IsHeadOfficeAdminAsync())
        {
            throw new UnauthorizedAccessException("Journal vouchers can only be managed by Head Office.");
        }
    }

    public async Task<List<JournalEntryDto>> GetAllAsync(DateTime? dateFrom, DateTime? dateTo)
    {
        await EnsureHeadOfficeAsync();

        var query = _context.JournalEntries
            .AsNoTracking()
            .Include(x => x.Lines).ThenInclude(l => l.ChartOfAccount)
            .Include(x => x.Lines).ThenInclude(l => l.Branch)
            .AsQueryable();

        if (dateFrom.HasValue) query = query.Where(x => x.Date >= dateFrom.Value.Date);
        if (dateTo.HasValue) query = query.Where(x => x.Date < dateTo.Value.Date.AddDays(1));

        var entries = await query
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Id)
            .ToListAsync();

        return entries.Select(ToDto).ToList();
    }

    public async Task<JournalEntryDto?> GetByIdAsync(int id)
    {
        await EnsureHeadOfficeAsync();

        var entry = await _context.JournalEntries
            .AsNoTracking()
            .Include(x => x.Lines).ThenInclude(l => l.ChartOfAccount)
            .Include(x => x.Lines).ThenInclude(l => l.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);

        return entry is null ? null : ToDto(entry);
    }

    public async Task<JournalEntryDto> CreateAsync(CreateJournalEntryDto request)
    {
        await EnsureHeadOfficeAsync();

        if (request.Date == default)
        {
            throw new ArgumentException("Date is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new ArgumentException("Description is required.");
        }

        var lines = request.Lines ?? new List<CreateJournalEntryLineDto>();

        if (lines.Count < 2)
        {
            throw new ArgumentException("A journal voucher needs at least two lines.");
        }

        var accountIds = lines.Select(l => l.ChartOfAccountId).Distinct().ToList();
        var accounts = await _context.ChartOfAccounts
            .Where(a => accountIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id);

        var branchIds = lines.Where(l => l.BranchId.HasValue).Select(l => l.BranchId!.Value).Distinct().ToList();
        var branches = await _context.Branches
            .Where(b => branchIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id);

        var entity = new JournalEntry
        {
            Date = request.Date.Date,
            Description = request.Description.Trim(),
            EntryType = ManualType,
            CreatedAt = DateTime.UtcNow,
        };

        var lineNumber = 0;
        foreach (var line in lines)
        {
            lineNumber++;

            if (!accounts.TryGetValue(line.ChartOfAccountId, out var account))
            {
                throw new ArgumentException($"Line {lineNumber}: account not found.");
            }

            if (!account.IsActive)
            {
                throw new InvalidOperationException($"Line {lineNumber}: account '{account.AccountDescription}' is inactive.");
            }

            if (line.BranchId.HasValue && !branches.ContainsKey(line.BranchId.Value))
            {
                throw new ArgumentException($"Line {lineNumber}: branch not found.");
            }

            var debit = decimal.Round(line.Debit, 2);
            var credit = decimal.Round(line.Credit, 2);

            if (debit < 0 || credit < 0)
            {
                throw new ArgumentException($"Line {lineNumber}: amounts cannot be negative.");
            }

            if ((debit > 0) == (credit > 0))
            {
                throw new ArgumentException($"Line {lineNumber}: enter either a Debit or a Credit amount (not both, not zero).");
            }

            entity.Lines.Add(new JournalEntryLine
            {
                ChartOfAccountId = account.Id,
                BranchId = line.BranchId,
                Debit = debit,
                Credit = credit,
                Note = line.Note?.Trim() ?? string.Empty,
            });
        }

        var totalDebit = entity.Lines.Sum(l => l.Debit);
        var totalCredit = entity.Lines.Sum(l => l.Credit);

        if (totalDebit != totalCredit)
        {
            throw new InvalidOperationException($"Total debit ({totalDebit:N2}) must equal total credit ({totalCredit:N2}).");
        }

        await SetCreatorAsync(entity);
        entity.EntryNumber = await NextNumberAsync();

        _context.JournalEntries.Add(entity);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await EnsureHeadOfficeAsync();

        var entry = await _context.JournalEntries.FirstOrDefaultAsync(x => x.Id == id);
        if (entry is null)
        {
            return false;
        }

        if (entry.EntryType != ManualType)
        {
            throw new InvalidOperationException("Year-end closing entries are removed from the Period Closing page (Reopen year).");
        }

        _context.JournalEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<string> NextNumberAsync()
    {
        var lastId = await _context.JournalEntries.MaxAsync(x => (int?)x.Id) ?? 0;
        var number = lastId + 1;
        string candidate;

        do
        {
            candidate = $"JV-{number:D5}";
            number++;
        }
        while (await _context.JournalEntries.AnyAsync(x => x.EntryNumber == candidate));

        return candidate;
    }

    internal async Task SetCreatorAsync(JournalEntry entity)
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        if (principal is null)
        {
            return;
        }

        var user = await _userManager.GetUserAsync(principal);
        entity.CreatedByUserId = user?.Id;
        entity.CreatedByName = user?.FullName ?? principal.Identity?.Name ?? string.Empty;
    }

    internal static JournalEntryDto ToDto(JournalEntry entry) => new()
    {
        Id = entry.Id,
        EntryNumber = entry.EntryNumber,
        Date = entry.Date,
        Description = entry.Description,
        EntryType = entry.EntryType,
        CreatedByName = entry.CreatedByName,
        CreatedAt = entry.CreatedAt,
        TotalDebit = entry.Lines.Sum(l => l.Debit),
        TotalCredit = entry.Lines.Sum(l => l.Credit),
        Lines = entry.Lines
            .OrderBy(l => l.Id)
            .Select(l => new JournalEntryLineDto
            {
                Id = l.Id,
                ChartOfAccountId = l.ChartOfAccountId,
                AccountId = l.ChartOfAccount?.AccountId ?? string.Empty,
                AccountDescription = l.ChartOfAccount?.AccountDescription ?? string.Empty,
                BranchId = l.BranchId,
                BranchName = l.Branch?.Name ?? "All / Institution",
                Debit = l.Debit,
                Credit = l.Credit,
                Note = l.Note,
            })
            .ToList(),
    };
}