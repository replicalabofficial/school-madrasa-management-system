using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.FeeSetup;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public interface IFeePostingService
{
    Task<FeePostingPreviewDto> PreviewAsync(FeePostingRequest request);
    Task<FeePostingPreviewDto> PostAsync(FeePostingRequest request);
    Task<List<FeePostingListItemDto>> GetAllAsync(int? branchId);
    Task<int> UndoAsync(int postingId);
}

public class FeePostingService : IFeePostingService
{
    public const string MonthlyCategory = "Monthly Fee";
    private const string MonthlyCode = "MF";

    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _security;
    private readonly IFeeCategoryAccountMappingService _mappingService;
    private readonly IHttpContextAccessor _http;

    public FeePostingService(
        AppDbContext context,
        IBranchSecurityContext security,
        IFeeCategoryAccountMappingService mappingService,
        IHttpContextAccessor http)
    {
        _context = context;
        _security = security;
        _mappingService = mappingService;
        _http = http;
    }

    public async Task<FeePostingPreviewDto> PreviewAsync(FeePostingRequest request)
    {
        var (preview, _) = await BuildAsync(request);
        return preview;
    }

    public async Task<FeePostingPreviewDto> PostAsync(FeePostingRequest request)
    {
        var (preview, students) = await BuildAsync(request);

        var newRows = preview.Rows.Where(r => r.Status == "New").ToList();
        if (newRows.Count == 0)
        {
            throw new InvalidOperationException("Nothing to post. All students already have this month's fee, or no student has a monthly fee set.");
        }

        var accountId = await _mappingService.ResolveAccountIdAsync(MonthlyCategory, request.BranchId);
        if (!accountId.HasValue)
        {
            throw new InvalidOperationException("No income account is configured for 'Monthly Fee'. Set it up in Fee Category Accounts (Head Office).");
        }

        var posting = new FeePosting
        {
            BranchId = request.BranchId,
            Month = request.Month,
            Year = request.Year,
            Class = string.IsNullOrWhiteSpace(request.Class) ? null : request.Class.Trim(),
            FeeDate = request.FeeDate.Date,
            StudentCount = newRows.Count,
            GrossTotal = newRows.Sum(r => r.Gross),
            DiscountTotal = newRows.Sum(r => r.Discount),
            NetTotal = newRows.Sum(r => r.Net),
            PostedBy = CurrentUserName(),
            PostedAt = DateTime.UtcNow,
        };

        var period = PeriodText(request.Month, request.Year);
        var fees = newRows.Select(r => new Fee
        {
            SerialNumber = r.SerialNumber,
            StudentId = r.StudentId,
            BranchId = request.BranchId,
            Category = MonthlyCategory,
            Amount = r.Gross,
            DiscountAmount = r.Discount,
            DiscountApprovalStatus = r.Discount > 0 ? r.DiscountStatus : null,
            FeePeriod = period,
            Date = request.FeeDate.Date,
            Status = "Pending",
            ChartOfAccountId = accountId,
            Description = $"Monthly fee posting {period}",
            FeePosting = posting,
        }).ToList();

        _context.FeePostings.Add(posting);
        _context.Fees.AddRange(fees);
        await _context.SaveChangesAsync();

        foreach (var row in newRows) row.Status = "Posted";
        preview.PostingId = posting.Id;
        return preview;
    }

    public async Task<List<FeePostingListItemDto>> GetAllAsync(int? branchId)
    {
        var postings = await _context.FeePostings
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_security, branchId)
            .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month).ThenByDescending(x => x.PostedAt)
            .Take(200)
            .ToListAsync();

        var ids = postings.Select(p => p.Id).ToList();
        var paidCounts = await _context.Fees
            .AsNoTracking()
            .Where(f => f.FeePostingId.HasValue && ids.Contains(f.FeePostingId.Value) && f.Status == "Paid")
            .GroupBy(f => f.FeePostingId!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count);

        return postings.Select(p => new FeePostingListItemDto
        {
            Id = p.Id,
            BranchId = p.BranchId,
            BranchName = p.Branch?.Name ?? string.Empty,
            Period = PeriodText(p.Month, p.Year),
            Month = p.Month,
            Year = p.Year,
            Class = p.Class,
            FeeDate = p.FeeDate,
            StudentCount = p.StudentCount,
            GrossTotal = p.GrossTotal,
            DiscountTotal = p.DiscountTotal,
            NetTotal = p.NetTotal,
            PaidCount = paidCounts.TryGetValue(p.Id, out var c) ? c : 0,
            PostedBy = p.PostedBy,
            PostedAt = p.PostedAt,
        }).ToList();
    }

    // Removes a posting and its fees — only while none of its fees is paid
    public async Task<int> UndoAsync(int postingId)
    {
        var posting = await _context.FeePostings.FirstOrDefaultAsync(x => x.Id == postingId);
        if (posting is null) return -1;

        _security.EnsureBranchAccess(posting.BranchId);

        var fees = await _context.Fees.Where(f => f.FeePostingId == postingId).ToListAsync();

        if (fees.Any(f => f.Status == "Paid"))
        {
            throw new InvalidOperationException("Some fees of this posting are already paid. Undo those payments first.");
        }

        _context.Fees.RemoveRange(fees);
        _context.FeePostings.Remove(posting);
        await _context.SaveChangesAsync();
        return fees.Count;
    }

    private async Task<(FeePostingPreviewDto Preview, List<Student> Students)> BuildAsync(FeePostingRequest request)
    {
        if (!_security.IsHeadOffice)
        {
            request.BranchId = _security.GetRequiredBranchId();
        }

        if (request.BranchId <= 0) throw new ArgumentException("Select a branch.");
        if (request.Month < 1 || request.Month > 12) throw new ArgumentException("Select a valid month.");
        if (request.Year < 2000 || request.Year > 2100) throw new ArgumentException("Select a valid year.");
        if (request.FeeDate == default) request.FeeDate = new DateTime(request.Year, request.Month, 1);

        _security.EnsureBranchAccess(request.BranchId);

        var query = _context.Students
            .AsNoTracking()
            .Where(s => s.BranchId == request.BranchId && s.IsActive);

        if (!string.IsNullOrWhiteSpace(request.Class))
        {
            var cls = request.Class.Trim().ToLower();
            query = query.Where(s => s.Class.ToLower() == cls);
        }

        var students = (await query.ToListAsync())
            .OrderBy(s => s.Class, ClassNameComparer.Instance)
            .ThenBy(s => s.Name)
            .ToList();

        var monthAbbr = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(request.Month).ToUpperInvariant();
        var serialSuffix = $"-{MonthlyCode}-{monthAbbr}{request.Year}";

        var serials = students.Select(s => (s.GrNumber.Trim() + serialSuffix)).ToList();
        var existing = (await _context.Fees
                .AsNoTracking()
                .Where(f => serials.Contains(f.SerialNumber))
                .Select(f => f.SerialNumber)
                .ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var preview = new FeePostingPreviewDto { Period = PeriodText(request.Month, request.Year) };

        foreach (var s in students)
        {
            var serial = s.GrNumber.Trim() + serialSuffix;
            var gross = s.MonthlyFee;
            var discount = s.MonthlyDiscount > 0 && s.DiscountStatus is "Approved" or "PendingApproval"
                ? Math.Min(s.MonthlyDiscount, gross)
                : 0m;

            var row = new FeePostingRowDto
            {
                StudentId = s.Id,
                GrNumber = s.GrNumber,
                Name = s.Name,
                Class = s.Class,
                SerialNumber = serial,
                Gross = gross,
                Discount = discount,
                Net = gross - discount,
                DiscountStatus = discount > 0 ? s.DiscountStatus : null,
            };

            if (gross <= 0) { row.Status = "NoFee"; preview.NoFeeCount++; }
            else if (existing.Contains(serial)) { row.Status = "AlreadyPosted"; preview.AlreadyPostedCount++; }
            else { row.Status = "New"; preview.NewCount++; }

            preview.Rows.Add(row);
        }

        var newRows = preview.Rows.Where(r => r.Status == "New").ToList();
        preview.GrossTotal = newRows.Sum(r => r.Gross);
        preview.DiscountTotal = newRows.Sum(r => r.Discount);
        preview.NetTotal = newRows.Sum(r => r.Net);
        preview.Classes = newRows
            .GroupBy(r => r.Class)
            .OrderBy(g => g.Key, ClassNameComparer.Instance)
            .Select(g => new FeePostingClassSummaryDto
            {
                Class = g.Key,
                StudentCount = g.Count(),
                Gross = g.Sum(r => r.Gross),
                Discount = g.Sum(r => r.Discount),
                Net = g.Sum(r => r.Net),
            })
            .ToList();

        return (preview, students);
    }

    private string CurrentUserName()
    {
        var user = _http.HttpContext?.User;
        var name = user?.FindFirstValue("FullName") ?? user?.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
        return name.Length > 150 ? name[..150] : name;
    }

    private static string PeriodText(int month, int year) =>
        $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month)} {year}";
}
