using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Students;

namespace SchoolMadrasaManagementSystem.Services;

public class StudentService : IStudentService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _security;

    public StudentService(AppDbContext context, IBranchSecurityContext security)
    {
        _context = context;
        _security = security;
    }

    public async Task<List<Student>> GetAllAsync()
    {
        return await _context.Students
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_security)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<Student?> GetByIdAsync(int id)
    {
        var student = await _context.Students
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (student is null) return null;

        _security.EnsureBranchAccess(student.BranchId);
        return student;
    }

    public async Task<Student> CreateAsync(Student student)
    {
        Validate(student);

        if (!_security.IsHeadOffice)
        {
            student.BranchId = _security.GetRequiredBranchId();
        }

        var branchExists = await _context.Branches
            .AnyAsync(x => x.Id == student.BranchId && x.IsActive);

        if (!branchExists)
        {
            throw new InvalidOperationException("Selected branch does not exist or is inactive.");
        }

        var grNumber = student.GrNumber.Trim();

        var duplicateGr = await _context.Students.AnyAsync(x => x.GrNumber == grNumber);
        if (duplicateGr)
        {
            throw new InvalidOperationException("A student with this GR Number already exists.");
        }

        student.GrNumber = grNumber;
        student.CreatedAt = DateTime.UtcNow;
        student.IsActive = true;
        student.LeftDate = null;
        NormalizeContact(student);
        student.AdmissionDate = (student.AdmissionDate ?? DateTime.UtcNow).Date;

        // New admission: monthly fee comes from Fee Setup (branch users cannot type their own)
        var setup = await FindLatestSetupAsync(student.BranchId, student.Class);
        if (setup is not null && (!_security.IsHeadOffice || student.MonthlyFee <= 0))
        {
            student.MonthlyFee = setup.NewAdmissionMonthlyFee > 0 ? setup.NewAdmissionMonthlyFee : setup.MonthlyFee;
        }

        ValidateMoney(student);
        ApplyDiscountRequest(student, previousDiscount: 0m, previousStatus: null);

        _context.Students.Add(student);
        await _context.SaveChangesAsync();

        return await _context.Students.Include(x => x.Branch).FirstAsync(x => x.Id == student.Id);
    }

    public async Task<bool> UpdateAsync(Student student)
    {
        Validate(student);

        var existing = await _context.Students.FirstOrDefaultAsync(x => x.Id == student.Id);
        if (existing is null) return false;

        _security.EnsureBranchAccess(existing.BranchId);

        if (!_security.IsHeadOffice)
        {
            student.BranchId = existing.BranchId;
        }

        var branchExists = await _context.Branches
            .AnyAsync(x => x.Id == student.BranchId && x.IsActive);

        if (!branchExists)
        {
            throw new InvalidOperationException("Selected branch does not exist or is inactive.");
        }

        var grNumber = student.GrNumber.Trim();

        var duplicateGr = await _context.Students
            .AnyAsync(x => x.Id != student.Id && x.GrNumber == grNumber);

        if (duplicateGr)
        {
            throw new InvalidOperationException("A student with this GR Number already exists.");
        }

        existing.Name = student.Name.Trim();
        existing.Class = student.Class.Trim();
        existing.BranchId = student.BranchId;
        existing.GrNumber = grNumber;

        NormalizeContact(student);
        existing.FatherName = student.FatherName;
        existing.FatherCnic = student.FatherCnic;
        existing.ParentPhone = student.ParentPhone;
        if (student.AdmissionDate.HasValue) existing.AdmissionDate = student.AdmissionDate.Value.Date;

        // Only Head Office can change a student's monthly fee (branches use Fee Setup)
        if (_security.IsHeadOffice)
        {
            existing.MonthlyFee = student.MonthlyFee;
        }

        ValidateMoney(existing, student.MonthlyDiscount);

        var previousDiscount = existing.MonthlyDiscount;
        var previousStatus = existing.DiscountStatus;
        existing.MonthlyDiscount = student.MonthlyDiscount;
        ApplyDiscountRequest(existing, previousDiscount, previousStatus);

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkLeftAsync(int id, DateTime leftDate)
    {
        var student = await _context.Students.FirstOrDefaultAsync(x => x.Id == id);
        if (student is null) return false;

        _security.EnsureBranchAccess(student.BranchId);

        student.IsActive = false;
        student.LeftDate = leftDate;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var student = await _context.Students.FirstOrDefaultAsync(x => x.Id == id);
        if (student is null) return false;

        _security.EnsureBranchAccess(student.BranchId);

        _context.Students.Remove(student);
        await _context.SaveChangesAsync();
        return true;
    }

    private const int MaxImportRows = 3000;
    private const int MaxNameLength = 200;
    private const int MaxClassLength = 50;
    private const int MaxGrLength = 50;

    public async Task<StudentImportResultDto> ImportAsync(StudentImportRequest request)
    {
        var rows = request.Rows ?? new List<StudentImportRowDto>();

        if (rows.Count == 0)
        {
            throw new ArgumentException("The file has no student rows.");
        }

        if (rows.Count > MaxImportRows)
        {
            throw new ArgumentException($"Maximum {MaxImportRows} students can be imported at once. Split the file.");
        }

        var activeBranches = await _context.Branches.AsNoTracking().Where(b => b.IsActive).ToListAsync();
        int? userBranchId = _security.IsHeadOffice ? null : _security.GetRequiredBranchId();

        var existingGr = (await _context.Students.AsNoTracking().Select(s => s.GrNumber).ToListAsync())
            .Select(g => g.Trim().ToLowerInvariant())
            .ToHashSet();

        // Latest session's normal monthly fee per branch + class
        var setupLookup = (await _context.FeeStructures.AsNoTracking().ToListAsync())
            .GroupBy(x => (x.BranchId, x.Class.Trim().ToLowerInvariant()))
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Session, StringComparer.Ordinal).First().MonthlyFee);

        var seenInFile = new HashSet<string>();
        var results = new List<StudentImportRowResultDto>();
        var toAdd = new List<(StudentImportRowResultDto Result, Student Student)>();

        foreach (var row in rows)
        {
            var gr = (row.GrNumber ?? string.Empty).Trim();
            var name = (row.Name ?? string.Empty).Trim();
            var cls = (row.Class ?? string.Empty).Trim();
            var branchText = (row.Branch ?? string.Empty).Trim();

            var result = new StudentImportRowResultDto
            {
                RowNumber = row.RowNumber,
                GrNumber = gr,
                Name = name,
                Class = cls,
            };

            var errors = new List<string>();

            if (string.IsNullOrEmpty(gr)) errors.Add("GR Number is missing");
            else if (gr.Length > MaxGrLength) errors.Add("GR Number is too long");

            if (string.IsNullOrEmpty(name)) errors.Add("Name is missing");
            else if (name.Length > MaxNameLength) errors.Add("Name is too long");

            if (string.IsNullOrEmpty(cls)) errors.Add("Class is missing");
            else if (cls.Length > MaxClassLength) errors.Add("Class is too long");

            if (!string.IsNullOrEmpty(gr))
            {
                var key = gr.ToLowerInvariant();
                if (existingGr.Contains(key)) errors.Add("GR Number already exists in EFAS");
                else if (!seenInFile.Add(key)) errors.Add("GR Number is repeated in the file");
            }

            Branch? branch = null;
            if (userBranchId.HasValue)
            {
                branch = activeBranches.FirstOrDefault(b => b.Id == userBranchId.Value);
                if (branch is null) errors.Add("Your branch is inactive");
            }
            else if (string.IsNullOrEmpty(branchText))
            {
                errors.Add("Branch is missing");
            }
            else
            {
                branch = activeBranches.FirstOrDefault(b =>
                    string.Equals(b.Code, branchText, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(b.Name, branchText, StringComparison.OrdinalIgnoreCase));

                if (branch is null) errors.Add($"Branch '{branchText}' not found (use branch code or exact name)");
            }

            result.BranchName = branch?.Name ?? branchText;

            Student? candidate = null;
            if (errors.Count == 0)
            {
                candidate = new Student
                {
                    GrNumber = gr,
                    Name = name,
                    Class = cls,
                    BranchId = branch!.Id,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    FatherName = row.FatherName,
                    FatherCnic = row.FatherCnic,
                    ParentPhone = row.ParentPhone,
                    AdmissionDate = DateTime.UtcNow.Date,
                    MonthlyFee = row.MonthlyFee > 0 ? row.MonthlyFee!.Value : 0m,
                };

                try { NormalizeContact(candidate); }
                catch (ArgumentException ex) { errors.Add(ex.Message); }

                // Imported students are existing students: use the Fee Setup's normal monthly fee
                if (candidate.MonthlyFee <= 0 &&
                    setupLookup.TryGetValue((candidate.BranchId, cls.ToLowerInvariant()), out var setupFee))
                {
                    candidate.MonthlyFee = setupFee;
                }

                result.MonthlyFee = candidate.MonthlyFee;
            }

            if (errors.Count > 0)
            {
                result.Status = "Error";
                result.Message = string.Join("; ", errors);
            }
            else
            {
                result.Status = "Ready";
                toAdd.Add((result, candidate!));
            }

            results.Add(result);
        }

        var importedCount = 0;

        if (request.Commit && toAdd.Count > 0)
        {
            _context.Students.AddRange(toAdd.Select(x => x.Student));
            await _context.SaveChangesAsync();

            foreach (var item in toAdd)
            {
                item.Result.Status = "Imported";
            }

            importedCount = toAdd.Count;
        }

        return new StudentImportResultDto
        {
            TotalRows = results.Count,
            ValidRows = toAdd.Count,
            ErrorRows = results.Count(r => r.Status == "Error"),
            ImportedCount = importedCount,
            Committed = request.Commit,
            Rows = results.OrderBy(r => r.RowNumber).ToList(),
        };
    }

    public async Task<StudentPromotionResultDto> PromoteAsync(StudentPromotionRequest request)
    {
        var ids = (request.StudentIds ?? new List<int>()).Distinct().ToList();

        if (ids.Count == 0)
        {
            throw new ArgumentException("Select at least one student.");
        }

        var toClass = request.ToClass?.Trim() ?? string.Empty;

        if (!request.MarkAsLeft)
        {
            if (string.IsNullOrEmpty(toClass)) throw new ArgumentException("Select the new class.");
            if (toClass.Length > MaxClassLength) throw new ArgumentException("Class name is too long.");
        }

        var students = await _context.Students.Where(s => ids.Contains(s.Id)).ToListAsync();

        if (students.Count != ids.Count)
        {
            throw new InvalidOperationException("Some selected students were not found. Refresh and try again.");
        }

        foreach (var student in students)
        {
            _security.EnsureBranchAccess(student.BranchId);
        }

        var leftDate = (request.LeftDate ?? DateTime.UtcNow).Date;

        foreach (var student in students)
        {
            if (request.MarkAsLeft)
            {
                student.IsActive = false;
                student.LeftDate = leftDate;
            }
            else
            {
                student.Class = toClass;

                // New class = that class's normal monthly fee from Fee Setup (if set up)
                var fs = await FindLatestSetupAsync(student.BranchId, toClass);
                if (fs is not null) student.MonthlyFee = fs.MonthlyFee;
            }
        }

        await _context.SaveChangesAsync();
        return new StudentPromotionResultDto { UpdatedCount = students.Count };
    }

    // ---- Standing monthly discount (Head Office approval) ----

    public async Task<List<Student>> GetPendingDiscountsAsync()
    {
        return await _context.Students
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_security)
            .Where(x => x.IsActive && x.DiscountStatus == "PendingApproval")
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    // Approving also approves the same discount on this student's unpaid posted fees
    public async Task<bool> ApproveDiscountAsync(int id)
    {
        var student = await _context.Students.FirstOrDefaultAsync(x => x.Id == id);
        if (student is null) return false;

        if (student.DiscountStatus != "PendingApproval")
        {
            throw new InvalidOperationException("This student does not have a discount awaiting approval.");
        }

        student.DiscountStatus = "Approved";

        var pendingFees = await _context.Fees
            .Where(f => f.StudentId == id && f.FeePostingId != null && f.Status != "Paid" && f.DiscountApprovalStatus == "PendingApproval")
            .ToListAsync();

        foreach (var fee in pendingFees)
        {
            fee.DiscountApprovalStatus = "Approved";
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RejectDiscountAsync(int id)
    {
        var student = await _context.Students.FirstOrDefaultAsync(x => x.Id == id);
        if (student is null) return false;

        if (student.DiscountStatus != "PendingApproval")
        {
            throw new InvalidOperationException("This student does not have a discount awaiting approval.");
        }

        student.MonthlyDiscount = 0;
        student.DiscountStatus = null;
        await _context.SaveChangesAsync();
        return true;
    }

    // Head Office sets discounts directly (approved); branch changes wait for approval
    private void ApplyDiscountRequest(Student student, decimal previousDiscount, string? previousStatus)
    {
        if (student.MonthlyDiscount <= 0)
        {
            student.MonthlyDiscount = 0;
            student.DiscountStatus = null;
            return;
        }

        if (student.MonthlyDiscount == previousDiscount && previousStatus is not null)
        {
            student.DiscountStatus = previousStatus; // unchanged
            return;
        }

        student.DiscountStatus = _security.IsHeadOffice ? "Approved" : "PendingApproval";
    }

    private async Task<FeeStructure?> FindLatestSetupAsync(int branchId, string className)
    {
        var cls = (className ?? string.Empty).Trim().ToLower();
        if (cls.Length == 0) return null;

        return await _context.FeeStructures
            .AsNoTracking()
            .Where(x => x.BranchId == branchId && x.Class.ToLower() == cls)
            .OrderByDescending(x => x.Session)
            .FirstOrDefaultAsync();
    }

    private static void ValidateMoney(Student student, decimal? newDiscount = null)
    {
        var discount = newDiscount ?? student.MonthlyDiscount;
        if (student.MonthlyFee < 0) throw new ArgumentException("Monthly fee cannot be negative.");
        if (discount < 0) throw new ArgumentException("Discount cannot be negative.");
        if (discount > 0 && discount > student.MonthlyFee)
            throw new ArgumentException("Monthly discount cannot be greater than the monthly fee.");
    }

    // CNIC -> 12345-1234567-1, phone -> 03001234567 (so siblings match exactly)
    private static void NormalizeContact(Student s)
    {
        s.FatherName = string.IsNullOrWhiteSpace(s.FatherName) ? null : s.FatherName.Trim();

        var cnic = new string((s.FatherCnic ?? string.Empty).Where(char.IsDigit).ToArray());
        if (cnic.Length == 0) s.FatherCnic = null;
        else if (cnic.Length == 13) s.FatherCnic = $"{cnic[..5]}-{cnic.Substring(5, 7)}-{cnic[12]}";
        else throw new ArgumentException("Father CNIC must have 13 digits.");

        var phone = new string((s.ParentPhone ?? string.Empty).Where(char.IsDigit).ToArray());
        if (phone.StartsWith("92") && phone.Length == 12) phone = "0" + phone[2..];
        if (phone.Length == 0) s.ParentPhone = null;
        else if (phone.Length is >= 10 and <= 13) s.ParentPhone = phone;
        else throw new ArgumentException("Parent phone number is not valid.");
    }

    private static void Validate(Student student)
    {
        if (string.IsNullOrWhiteSpace(student.Name))
            throw new ArgumentException("Student name is required.");

        if (string.IsNullOrWhiteSpace(student.Class))
            throw new ArgumentException("Student class is required.");

        if (string.IsNullOrWhiteSpace(student.GrNumber))
            throw new ArgumentException("GR Number is required.");

        if (student.BranchId <= 0)
            throw new ArgumentException("Branch is required.");
    }
}