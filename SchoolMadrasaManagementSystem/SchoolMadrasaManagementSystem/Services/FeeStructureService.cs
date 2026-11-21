using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.FeeSetup;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public interface IFeeStructureService
{
    Task<List<FeeStructure>> GetAllAsync(int? branchId, string? session);
    Task<List<string>> GetSessionsAsync();
    Task<FeeStructure?> LookupAsync(int branchId, string className);
    Task<FeeStructure> CreateAsync(FeeStructureRequest request);
    Task<bool> UpdateAsync(int id, FeeStructureRequest request);
    Task<bool> DeleteAsync(int id);
    Task<ApplyFeeStructureResultDto> ApplyToStudentsAsync(ApplyFeeStructureRequest request);
}

public class FeeStructureService : IFeeStructureService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _security;

    public FeeStructureService(AppDbContext context, IBranchSecurityContext security)
    {
        _context = context;
        _security = security;
    }

    public async Task<List<FeeStructure>> GetAllAsync(int? branchId, string? session)
    {
        var query = _context.FeeStructures
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_security, branchId);

        if (!string.IsNullOrWhiteSpace(session))
        {
            var s = session.Trim();
            query = query.Where(x => x.Session == s);
        }

        var rows = await query.ToListAsync();

        return rows
            .OrderBy(x => x.Branch.Name)
            .ThenByDescending(x => x.Session)
            .ThenBy(x => x.Class, ClassNameComparer.Instance)
            .ToList();
    }

    public async Task<List<string>> GetSessionsAsync()
    {
        return await _context.FeeStructures
            .AsNoTracking()
            .ApplyBranchFilter(_security)
            .Select(x => x.Session)
            .Distinct()
            .OrderByDescending(x => x)
            .ToListAsync();
    }

    // Latest session's setup for a branch + class (used to auto-fill a new student's fee)
    public async Task<FeeStructure?> LookupAsync(int branchId, string className)
    {
        _security.EnsureBranchAccess(branchId);
        var cls = (className ?? string.Empty).Trim();
        if (cls.Length == 0) return null;

        return await FindLatestAsync(branchId, cls);
    }

    public async Task<FeeStructure> CreateAsync(FeeStructureRequest request)
    {
        Validate(request);
        await EnsureBranchAsync(request.BranchId);

        var session = request.Session.Trim();
        var cls = request.Class.Trim();

        var exists = await _context.FeeStructures.AnyAsync(x =>
            x.BranchId == request.BranchId && x.Session == session && x.Class.ToLower() == cls.ToLower());

        if (exists)
        {
            throw new InvalidOperationException($"Fee setup for class '{cls}' in session {session} already exists for this branch. Edit it instead.");
        }

        var entity = new FeeStructure
        {
            BranchId = request.BranchId,
            Session = session,
            Class = cls,
            MonthlyFee = request.MonthlyFee,
            NewAdmissionMonthlyFee = request.NewAdmissionMonthlyFee > 0 ? request.NewAdmissionMonthlyFee : request.MonthlyFee,
            AdmissionFee = request.AdmissionFee,
            FormFee = request.FormFee,
            StationeryFee = request.StationeryFee,
            CreatedAt = DateTime.UtcNow,
        };

        _context.FeeStructures.Add(entity);
        await _context.SaveChangesAsync();

        return await _context.FeeStructures.Include(x => x.Branch).FirstAsync(x => x.Id == entity.Id);
    }

    public async Task<bool> UpdateAsync(int id, FeeStructureRequest request)
    {
        Validate(request);

        var existing = await _context.FeeStructures.FirstOrDefaultAsync(x => x.Id == id);
        if (existing is null) return false;

        var session = request.Session.Trim();
        var cls = request.Class.Trim();

        var duplicate = await _context.FeeStructures.AnyAsync(x =>
            x.Id != id && x.BranchId == existing.BranchId && x.Session == session && x.Class.ToLower() == cls.ToLower());

        if (duplicate)
        {
            throw new InvalidOperationException($"Fee setup for class '{cls}' in session {session} already exists for this branch.");
        }

        existing.Session = session;
        existing.Class = cls;
        existing.MonthlyFee = request.MonthlyFee;
        existing.NewAdmissionMonthlyFee = request.NewAdmissionMonthlyFee > 0 ? request.NewAdmissionMonthlyFee : request.MonthlyFee;
        existing.AdmissionFee = request.AdmissionFee;
        existing.FormFee = request.FormFee;
        existing.StationeryFee = request.StationeryFee;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _context.FeeStructures.FirstOrDefaultAsync(x => x.Id == id);
        if (existing is null) return false;

        _context.FeeStructures.Remove(existing);
        await _context.SaveChangesAsync();
        return true;
    }

    // August: set every active student's monthly fee from the selected session's setup
    public async Task<ApplyFeeStructureResultDto> ApplyToStudentsAsync(ApplyFeeStructureRequest request)
    {
        await EnsureBranchAsync(request.BranchId);

        var session = (request.Session ?? string.Empty).Trim();
        if (session.Length == 0) throw new ArgumentException("Select a session.");

        var setup = await _context.FeeStructures
            .AsNoTracking()
            .Where(x => x.BranchId == request.BranchId && x.Session == session)
            .ToListAsync();

        if (setup.Count == 0)
        {
            throw new InvalidOperationException($"No fee setup found for session {session} in this branch.");
        }

        var byClass = setup.ToDictionary(x => x.Class.Trim().ToLowerInvariant(), x => x);

        var students = await _context.Students
            .Where(x => x.BranchId == request.BranchId && x.IsActive)
            .ToListAsync();

        var result = new ApplyFeeStructureResultDto
        {
            TotalStudents = students.Count,
            Committed = request.Commit,
        };

        foreach (var student in students.OrderBy(s => s.Class, ClassNameComparer.Instance).ThenBy(s => s.Name))
        {
            var row = new ApplyFeeStructureRowDto
            {
                StudentId = student.Id,
                GrNumber = student.GrNumber,
                Name = student.Name,
                Class = student.Class,
                OldFee = student.MonthlyFee,
            };

            if (!byClass.TryGetValue(student.Class.Trim().ToLowerInvariant(), out var fs))
            {
                row.NewFee = student.MonthlyFee;
                row.Status = "NoSetup";
                result.NoSetupCount++;
            }
            else if (student.MonthlyFee == fs.MonthlyFee)
            {
                row.NewFee = fs.MonthlyFee;
                row.Status = "NoChange";
            }
            else if (request.SkipIfLower && student.MonthlyFee > fs.MonthlyFee)
            {
                row.NewFee = student.MonthlyFee;
                row.Status = "Skipped";
            }
            else
            {
                row.NewFee = fs.MonthlyFee;
                row.Status = "Change";
                result.ChangedCount++;

                if (request.Commit)
                {
                    student.MonthlyFee = fs.MonthlyFee;
                }
            }

            result.Rows.Add(row);
        }

        if (request.Commit && result.ChangedCount > 0)
        {
            await _context.SaveChangesAsync();
        }

        return result;
    }

    private async Task<FeeStructure?> FindLatestAsync(int branchId, string cls)
    {
        var lower = cls.ToLower();
        return await _context.FeeStructures
            .AsNoTracking()
            .Where(x => x.BranchId == branchId && x.Class.ToLower() == lower)
            .OrderByDescending(x => x.Session)
            .FirstOrDefaultAsync();
    }

    private async Task EnsureBranchAsync(int branchId)
    {
        if (branchId <= 0) throw new ArgumentException("Select a branch.");
        _security.EnsureBranchAccess(branchId);

        var ok = await _context.Branches.AnyAsync(x => x.Id == branchId && x.IsActive);
        if (!ok) throw new InvalidOperationException("Selected branch does not exist or is inactive.");
    }

    private static void Validate(FeeStructureRequest r)
    {
        if (r.BranchId <= 0) throw new ArgumentException("Select a branch.");
        if (string.IsNullOrWhiteSpace(r.Session)) throw new ArgumentException("Session is required (e.g. 2026-27).");
        if (r.Session.Trim().Length > 20) throw new ArgumentException("Session is too long.");
        if (string.IsNullOrWhiteSpace(r.Class)) throw new ArgumentException("Class is required.");
        if (r.Class.Trim().Length > 100) throw new ArgumentException("Class name is too long.");
        if (r.MonthlyFee < 0 || r.NewAdmissionMonthlyFee < 0 || r.AdmissionFee < 0 || r.FormFee < 0 || r.StationeryFee < 0)
            throw new ArgumentException("Fee amounts cannot be negative.");
        if (r.MonthlyFee <= 0) throw new ArgumentException("Monthly fee must be greater than zero.");
    }
}

// Sorts "Nursery, KG, 1, 2, 10" naturally (numbers by value, words alphabetically)
public sealed class ClassNameComparer : IComparer<string>
{
    public static readonly ClassNameComparer Instance = new();

    public int Compare(string? x, string? y)
    {
        x ??= string.Empty;
        y ??= string.Empty;

        var xn = LeadingNumber(x);
        var yn = LeadingNumber(y);

        if (xn.HasValue && yn.HasValue && xn != yn) return xn.Value.CompareTo(yn.Value);
        if (xn.HasValue != yn.HasValue) return xn.HasValue ? 1 : -1; // words (Nursery, KG) first
        return string.Compare(x, y, StringComparison.OrdinalIgnoreCase);
    }

    private static int? LeadingNumber(string s)
    {
        var digits = new string(s.Trim().TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(digits, out var n) ? n : null;
    }
}
