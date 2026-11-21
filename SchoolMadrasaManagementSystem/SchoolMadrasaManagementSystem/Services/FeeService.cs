using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public class FeeService : IFeeService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _security;
    private readonly IFeeCategoryAccountMappingService _mappingService;

    public FeeService(
        AppDbContext context,
        IBranchSecurityContext security,
        IFeeCategoryAccountMappingService mappingService)
    {
        _context = context;
        _security = security;
        _mappingService = mappingService;
    }

    public async Task<List<Fee>> GetAllAsync()
    {
        return await _context.Fees
            .AsNoTracking()
            .Include(x => x.Student)
            .Include(x => x.Branch)
            .Include(x => x.ChartOfAccount)
            .Include(x => x.SourceAccount)
            .ApplyBranchFilter(_security)
            .OrderByDescending(x => x.Date)
            .ToListAsync();
    }

    public async Task<Fee?> GetByIdAsync(int id)
    {
        var fee = await _context.Fees
            .Include(x => x.Student)
            .Include(x => x.Branch)
            .Include(x => x.ChartOfAccount)
            .Include(x => x.SourceAccount)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (fee is null) return null;

        _security.EnsureBranchAccess(fee.BranchId);
        return fee;
    }

    public async Task<Fee> CreateAsync(Fee fee)
    {
        Validate(fee);

        var student = await _context.Students.FirstOrDefaultAsync(x => x.Id == fee.StudentId);
        if (student is null)
        {
            throw new InvalidOperationException("Selected student does not exist.");
        }

        _security.EnsureBranchAccess(student.BranchId);
        fee.BranchId = student.BranchId;

        var duplicateSerial = await _context.Fees.AnyAsync(x => x.SerialNumber == fee.SerialNumber.Trim());
        if (duplicateSerial)
        {
            throw new InvalidOperationException("A fee for this student, category and period already exists.");
        }

        fee.SerialNumber = fee.SerialNumber.Trim();
        fee.Category = fee.Category.Trim();
        // A new fee is always unpaid; payment only through MarkPaid (so Cash is recorded)
        fee.Status = "Pending";
        fee.PaidDate = null;
        fee.SourceAccountId = null;
        fee.FeePeriod = fee.FeePeriod.Trim();
        fee.Notes = string.IsNullOrWhiteSpace(fee.Notes) ? null : fee.Notes.Trim();
        fee.Description = string.IsNullOrWhiteSpace(fee.Description) ? null : fee.Description.Trim();

        fee.ChartOfAccountId = await _mappingService.ResolveAccountIdAsync(fee.Category, fee.BranchId);

        if (fee.DiscountAmount > 0)
        {
            if (fee.DiscountAmount > fee.Amount)
            {
                throw new ArgumentException("Discount cannot be greater than the fee amount.");
            }
            fee.DiscountApprovalStatus = "PendingApproval";
        }
        else
        {
            fee.DiscountAmount = 0;
            fee.DiscountApprovalStatus = null;
        }

        _context.Fees.Add(fee);
        await _context.SaveChangesAsync();

        return await _context.Fees
            .Include(x => x.Student)
            .Include(x => x.Branch)
            .Include(x => x.ChartOfAccount)
            .Include(x => x.SourceAccount)
            .FirstAsync(x => x.Id == fee.Id);
    }

    public async Task<bool> UpdateAsync(Fee fee)
    {
        Validate(fee);

        var existing = await _context.Fees.FirstOrDefaultAsync(x => x.Id == fee.Id);
        if (existing is null) return false;

        _security.EnsureBranchAccess(existing.BranchId);

        var student = await _context.Students.FirstOrDefaultAsync(x => x.Id == fee.StudentId);
        if (student is null)
        {
            throw new InvalidOperationException("Selected student does not exist.");
        }

        _security.EnsureBranchAccess(student.BranchId);

        if (student.BranchId != existing.BranchId)
        {
            throw new InvalidOperationException("Student and fee must belong to the same branch.");
        }

        // A paid fee's money details cannot be edited (cash is already recorded)
        if (existing.Status == "Paid")
        {
            var moneyChanged =
                existing.StudentId != fee.StudentId ||
                !string.Equals(existing.Category, fee.Category.Trim(), StringComparison.Ordinal) ||
                existing.Amount != fee.Amount ||
                !string.Equals(existing.FeePeriod, fee.FeePeriod.Trim(), StringComparison.Ordinal) ||
                existing.Date.Date != fee.Date.Date ||
                existing.DiscountAmount != fee.DiscountAmount;

            if (moneyChanged)
            {
                throw new InvalidOperationException("This fee is already paid. Mark it as unpaid first to change the amount, student, category, period, date or discount.");
            }
        }

        if (existing.DiscountAmount > 0 && fee.DiscountAmount == existing.DiscountAmount && existing.DiscountAmount > fee.Amount)
        {
            throw new ArgumentException("Fee amount cannot be less than the discount.");
        }

        existing.StudentId = fee.StudentId;
        existing.Category = fee.Category.Trim();
        existing.Amount = fee.Amount;
        existing.FeePeriod = fee.FeePeriod.Trim();
        existing.Date = fee.Date;
        // Status is NOT changed here — only through MarkPaid / MarkPending
        existing.Notes = string.IsNullOrWhiteSpace(fee.Notes) ? null : fee.Notes.Trim();
        existing.Description = string.IsNullOrWhiteSpace(fee.Description) ? null : fee.Description.Trim();

        var resolved = await _mappingService.ResolveAccountIdAsync(existing.Category, existing.BranchId);
        if (resolved.HasValue)
        {
            existing.ChartOfAccountId = resolved;
        }

        if (fee.DiscountAmount != existing.DiscountAmount)
        {
            if (fee.DiscountAmount > 0)
            {
                if (fee.DiscountAmount > fee.Amount)
                {
                    throw new ArgumentException("Discount cannot be greater than the fee amount.");
                }
                existing.DiscountAmount = fee.DiscountAmount;
                existing.DiscountApprovalStatus = "PendingApproval";
            }
            else
            {
                existing.DiscountAmount = 0;
                existing.DiscountApprovalStatus = null;
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkPaidAsync(int feeId)
    {
        var fee = await _context.Fees.FirstOrDefaultAsync(x => x.Id == feeId);
        if (fee is null) return false;

        _security.EnsureBranchAccess(fee.BranchId);

        if (fee.Status == "Paid")
        {
            return true; // already paid — keep the original paid date
        }

        if (!fee.ChartOfAccountId.HasValue)
        {
            fee.ChartOfAccountId = await _mappingService.ResolveAccountIdAsync(fee.Category, fee.BranchId);
        }

        if (!fee.ChartOfAccountId.HasValue)
        {
            throw new InvalidOperationException("No income account is configured for this fee category. Set it up in Fee Category Accounts (Head Office).");
        }

        if (fee.DiscountAmount > 0 && fee.DiscountApprovalStatus != "Approved")
        {
            throw new InvalidOperationException("This fee has a discount awaiting Head Office approval and cannot be marked paid yet.");
        }

        var cashAccountId = await ResolveCashAccountIdAsync(fee.BranchId);
        if (!cashAccountId.HasValue)
        {
            throw new InvalidOperationException("No CASH account is configured for this branch's Chart of Accounts.");
        }

        fee.SourceAccountId = cashAccountId.Value;
        fee.Status = "Paid";
        fee.PaidDate = PakistanToday();

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkPendingAsync(int feeId)
    {
        var fee = await _context.Fees.FirstOrDefaultAsync(x => x.Id == feeId);
        if (fee is null) return false;

        _security.EnsureBranchAccess(fee.BranchId);

        if (fee.Status != "Paid")
        {
            return true; // already unpaid
        }

        // Branch users can only undo a payment on the same day; older payments need Head Office
        if (!_security.IsHeadOffice && fee.PaidDate?.Date != PakistanToday())
        {
            throw new InvalidOperationException("Only Head Office can reverse a payment from a previous day.");
        }

        fee.Status = "Pending";
        fee.PaidDate = null;
        fee.SourceAccountId = null;
        fee.IsReconciled = false;
        fee.ReconciledAt = null;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ApproveDiscountAsync(int feeId)
    {
        var fee = await _context.Fees.FirstOrDefaultAsync(x => x.Id == feeId);
        if (fee is null) return false;

        if (fee.DiscountApprovalStatus != "PendingApproval")
        {
            throw new InvalidOperationException("This fee does not have a discount awaiting approval.");
        }

        fee.DiscountApprovalStatus = "Approved";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var fee = await _context.Fees.FirstOrDefaultAsync(x => x.Id == id);
        if (fee is null) return false;

        _security.EnsureBranchAccess(fee.BranchId);

        if (fee.Status == "Paid")
        {
            throw new InvalidOperationException("A paid fee cannot be deleted. Mark it as unpaid first.");
        }

        _context.Fees.Remove(fee);
        await _context.SaveChangesAsync();
        return true;
    }

    // Today's date in Pakistan (server may run in UTC)
    private static DateTime PakistanToday()
    {
        foreach (var id in new[] { "Asia/Karachi", "Pakistan Standard Time" })
        {
            try
            {
                var zone = TimeZoneInfo.FindSystemTimeZoneById(id);
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone).Date;
            }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }

        return DateTime.UtcNow.AddHours(5).Date;
    }

    private async Task<int?> ResolveCashAccountIdAsync(int branchId)
    {
        var account = await _context.ChartOfAccounts
            .Where(x => x.AccountType == "Cash" && x.AccountDescription == "CASH" && (x.BranchId == branchId || x.BranchId == null))
            .OrderByDescending(x => x.BranchId.HasValue)
            .FirstOrDefaultAsync();

        return account?.Id;
    }

    private static void Validate(Fee fee)
    {
        if (string.IsNullOrWhiteSpace(fee.SerialNumber))
            throw new ArgumentException("Serial number is required.");
        if (fee.StudentId <= 0)
            throw new ArgumentException("Student is required.");
        if (string.IsNullOrWhiteSpace(fee.Category))
            throw new ArgumentException("Fee category is required.");
        if (fee.Amount <= 0)
            throw new ArgumentException("Fee amount must be greater than zero.");
        if (string.IsNullOrWhiteSpace(fee.FeePeriod))
            throw new ArgumentException("Fee period is required.");
        if (fee.Date == default)
            throw new ArgumentException("Fee date is required.");
        if (string.IsNullOrWhiteSpace(fee.Status))
            throw new ArgumentException("Fee status is required.");
    }
}