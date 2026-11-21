using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.FeeSetup;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public interface IFeeReportService
{
    Task<StudentLedgerDto?> GetStudentLedgerAsync(int studentId);
    Task<ClassFeeSummaryDto> GetClassSummaryAsync(int? branchId, int month, int year, string? category);
    Task<LeftStudentsDuesDto> GetLeftStudentsDuesAsync(int? branchId);
}

public class FeeReportService : IFeeReportService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _security;

    public FeeReportService(AppDbContext context, IBranchSecurityContext security)
    {
        _context = context;
        _security = security;
    }

    // Same rule as the ledger: only an approved discount reduces the fee
    private static decimal ApprovedDiscount(Fee f) =>
        f.DiscountAmount > 0 && f.DiscountApprovalStatus == "Approved" ? Math.Min(f.DiscountAmount, f.Amount) : 0m;

    private static decimal Net(Fee f) => Math.Max(0m, f.Amount - ApprovedDiscount(f));

    public async Task<StudentLedgerDto?> GetStudentLedgerAsync(int studentId)
    {
        var student = await _context.Students.AsNoTracking().Include(s => s.Branch).FirstOrDefaultAsync(s => s.Id == studentId);
        if (student is null) return null;

        _security.EnsureBranchAccess(student.BranchId);

        var fees = await _context.Fees.AsNoTracking().Where(f => f.StudentId == studentId).ToListAsync();

        var entries = new List<StudentLedgerLineDto>();
        foreach (var f in fees)
        {
            var disc = ApprovedDiscount(f);
            entries.Add(new StudentLedgerLineDto
            {
                Date = f.Date,
                Type = "Fee",
                FeeId = f.Id,
                SerialNumber = f.SerialNumber,
                Description = $"{f.Category} · {f.FeePeriod}",
                Gross = f.Amount,
                Discount = disc,
                Debit = Net(f),
                DiscountStatus = f.DiscountAmount > 0 ? f.DiscountApprovalStatus : null,
            });

            if (f.Status == "Paid")
            {
                entries.Add(new StudentLedgerLineDto
                {
                    Date = f.PaidDate ?? f.Date,
                    Type = "Payment",
                    FeeId = f.Id,
                    SerialNumber = f.SerialNumber,
                    Description = $"Received · {f.Category} {f.FeePeriod}",
                    Credit = Net(f),
                });
            }
        }

        decimal running = 0;
        var ordered = entries
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Type == "Fee" ? 0 : 1)
            .ThenBy(e => e.FeeId)
            .ToList();

        foreach (var e in ordered)
        {
            running += e.Debit - e.Credit;
            e.Balance = running;
        }

        var dto = new StudentLedgerDto
        {
            StudentId = student.Id,
            GrNumber = student.GrNumber,
            Name = student.Name,
            Class = student.Class,
            BranchName = student.Branch?.Name ?? string.Empty,
            FatherName = student.FatherName,
            FatherCnic = student.FatherCnic,
            ParentPhone = student.ParentPhone,
            IsActive = student.IsActive,
            LeftDate = student.LeftDate,
            MonthlyFee = student.MonthlyFee,
            MonthlyDiscount = student.MonthlyDiscount,
            DiscountStatus = student.DiscountStatus,
            TotalGross = fees.Sum(f => f.Amount),
            TotalDiscount = fees.Sum(f => ApprovedDiscount(f)),
            TotalCharged = fees.Sum(f => Net(f)),
            TotalPaid = fees.Where(f => f.Status == "Paid").Sum(f => Net(f)),
            UnpaidCount = fees.Count(f => f.Status != "Paid"),
            PendingDiscountAmount = fees.Where(f => f.Status != "Paid" && f.DiscountAmount > 0 && f.DiscountApprovalStatus != "Approved").Sum(f => f.DiscountAmount),
            Lines = ordered,
        };
        dto.Balance = dto.TotalCharged - dto.TotalPaid;

        dto.Family = await GetFamilyAsync(student);
        dto.FamilyDue = dto.Balance + dto.Family.Sum(m => m.Due);
        return dto;
    }

    public async Task<ClassFeeSummaryDto> GetClassSummaryAsync(int? branchId, int month, int year, string? category)
    {
        if (month < 1 || month > 12) throw new ArgumentException("Select a valid month.");
        if (year < 2000 || year > 2100) throw new ArgumentException("Select a valid year.");

        var period = $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month)} {year}";

        var feesQuery = _context.Fees.AsNoTracking().Include(f => f.Student).ApplyBranchFilter(_security, branchId)
            .Where(f => f.FeePeriod == period);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim();
            feesQuery = feesQuery.Where(f => f.Category == cat);
        }

        var fees = await feesQuery.ToListAsync();

        var activeCounts = await _context.Students.AsNoTracking().ApplyBranchFilter(_security, branchId)
            .Where(s => s.IsActive)
            .GroupBy(s => s.Class)
            .Select(g => new { Class = g.Key, Count = g.Count() })
            .ToListAsync();

        var classes = fees.Select(f => f.Student.Class)
            .Concat(activeCounts.Select(a => a.Class))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(c => c, ClassNameComparer.Instance)
            .ToList();

        var result = new ClassFeeSummaryDto { Period = period };

        if (branchId.HasValue || !_security.IsHeadOffice)
        {
            var id = branchId ?? _security.GetRequiredBranchId();
            result.BranchName = await _context.Branches.Where(b => b.Id == id).Select(b => b.Name).FirstOrDefaultAsync() ?? string.Empty;
        }
        else
        {
            result.BranchName = "All branches";
        }

        foreach (var cls in classes)
        {
            var cf = fees.Where(f => string.Equals(f.Student.Class, cls, StringComparison.OrdinalIgnoreCase)).ToList();
            var row = new ClassFeeSummaryRowDto
            {
                Class = cls,
                ActiveStudents = activeCounts.Where(a => string.Equals(a.Class, cls, StringComparison.OrdinalIgnoreCase)).Sum(a => a.Count),
                FeeCount = cf.Count,
                Gross = cf.Sum(f => f.Amount),
                Discount = cf.Sum(f => ApprovedDiscount(f)),
                Net = cf.Sum(f => Net(f)),
                Received = cf.Where(f => f.Status == "Paid").Sum(f => Net(f)),
                UnpaidCount = cf.Count(f => f.Status != "Paid"),
            };
            row.Balance = row.Net - row.Received;
            result.Rows.Add(row);
        }

        result.Total = new ClassFeeSummaryRowDto
        {
            Class = "Total",
            ActiveStudents = result.Rows.Sum(r => r.ActiveStudents),
            FeeCount = result.Rows.Sum(r => r.FeeCount),
            Gross = result.Rows.Sum(r => r.Gross),
            Discount = result.Rows.Sum(r => r.Discount),
            Net = result.Rows.Sum(r => r.Net),
            Received = result.Rows.Sum(r => r.Received),
            Balance = result.Rows.Sum(r => r.Balance),
            UnpaidCount = result.Rows.Sum(r => r.UnpaidCount),
        };

        return result;
    }

    public async Task<LeftStudentsDuesDto> GetLeftStudentsDuesAsync(int? branchId)
    {
        var unpaid = await _context.Fees.AsNoTracking()
            .Include(f => f.Student).ThenInclude(s => s.Branch)
            .ApplyBranchFilter(_security, branchId)
            .Where(f => f.Status != "Paid" && !f.Student.IsActive)
            .ToListAsync();

        // Possible siblings: active students with the same father CNIC or phone
        var keys = unpaid.Select(f => f.Student)
            .SelectMany(s => new[] { s.FatherCnic, s.ParentPhone })
            .Where(k => !string.IsNullOrEmpty(k))
            .Distinct()
            .ToList();

        var activeRelated = keys.Count == 0
            ? new List<Student>()
            : await _context.Students.AsNoTracking().Include(s => s.Branch)
                .ApplyBranchFilter(_security)
                .Where(s => s.IsActive && ((s.FatherCnic != null && keys.Contains(s.FatherCnic)) || (s.ParentPhone != null && keys.Contains(s.ParentPhone))))
                .ToListAsync();

        var result = new LeftStudentsDuesDto();

        foreach (var g in unpaid.GroupBy(f => f.StudentId))
        {
            var s = g.First().Student;
            var due = g.Sum(f => Net(f));
            if (due <= 0) continue;

            var siblings = activeRelated
                .Where(a => a.Id != s.Id && (SameKey(a.FatherCnic, s.FatherCnic) || SameKey(a.ParentPhone, s.ParentPhone)))
                .Select(a => new FamilyMemberDto
                {
                    StudentId = a.Id,
                    GrNumber = a.GrNumber,
                    Name = a.Name,
                    Class = a.Class,
                    BranchName = a.Branch?.Name ?? string.Empty,
                    IsActive = true,
                })
                .ToList();

            result.Rows.Add(new LeftStudentDueDto
            {
                StudentId = s.Id,
                GrNumber = s.GrNumber,
                Name = s.Name,
                Class = s.Class,
                BranchName = s.Branch?.Name ?? string.Empty,
                LeftDate = s.LeftDate,
                FatherName = s.FatherName,
                ParentPhone = s.ParentPhone,
                UnpaidCount = g.Count(),
                Due = due,
                OldestDueDate = g.Min(f => f.Date),
                ActiveSiblings = siblings,
            });
        }

        result.Rows = result.Rows.OrderByDescending(r => r.Due).ToList();
        result.StudentCount = result.Rows.Count;
        result.TotalDue = result.Rows.Sum(r => r.Due);
        result.RecoverableThroughSiblings = result.Rows.Count(r => r.ActiveSiblings.Count > 0);
        result.RecoverableAmount = result.Rows.Where(r => r.ActiveSiblings.Count > 0).Sum(r => r.Due);
        return result;
    }

    private static bool SameKey(string? a, string? b) => !string.IsNullOrEmpty(a) && a == b;

    // Siblings = same father CNIC or same parent phone (branch users only see their own branch)
    private async Task<List<FamilyMemberDto>> GetFamilyAsync(Student student)
    {
        if (string.IsNullOrEmpty(student.FatherCnic) && string.IsNullOrEmpty(student.ParentPhone))
        {
            return new List<FamilyMemberDto>();
        }

        var cnic = student.FatherCnic;
        var phone = student.ParentPhone;

        var siblings = await _context.Students.AsNoTracking().Include(s => s.Branch)
            .ApplyBranchFilter(_security)
            .Where(s => s.Id != student.Id &&
                        ((cnic != null && s.FatherCnic == cnic) || (phone != null && s.ParentPhone == phone)))
            .ToListAsync();

        if (siblings.Count == 0) return new List<FamilyMemberDto>();

        var ids = siblings.Select(s => s.Id).ToList();
        var unpaid = await _context.Fees.AsNoTracking()
            .Where(f => ids.Contains(f.StudentId) && f.Status != "Paid")
            .ToListAsync();

        return siblings
            .OrderByDescending(s => s.IsActive)
            .ThenBy(s => s.Name)
            .Select(s => new FamilyMemberDto
            {
                StudentId = s.Id,
                GrNumber = s.GrNumber,
                Name = s.Name,
                Class = s.Class,
                BranchName = s.Branch?.Name ?? string.Empty,
                IsActive = s.IsActive,
                LeftDate = s.LeftDate,
                Due = unpaid.Where(f => f.StudentId == s.Id).Sum(f => Net(f)),
            })
            .ToList();
    }
}
