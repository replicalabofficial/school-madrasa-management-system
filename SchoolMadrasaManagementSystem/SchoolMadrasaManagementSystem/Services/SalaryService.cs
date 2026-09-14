using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class SalaryService : ISalaryService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    private static readonly string[] AllowedStatuses =
    {
        "Pending",
        "PartiallyPaid",
        "Paid"
    };

    public SalaryService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<List<Salary>> GetAllAsync()
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        return await _context.Salaries
            .Include(x => x.Staff)
            .Include(x => x.Branch)
            .ApplyBranchFilter(userBranchId, isHeadOffice)
            .OrderByDescending(x => x.SalaryMonth)
            .ThenBy(x => x.Staff.Name)
            .ToListAsync();
    }

    public async Task<Salary?> GetByIdAsync(int id)
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var salary = await _context.Salaries
            .Include(x => x.Staff)
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (salary == null) return null;

        // IDOR Check: Ensure user belongs to the salary's branch
        if (!isHeadOffice && userBranchId != salary.BranchId)
        {
            return null;
        }

        return salary;
    }

    public async Task<Salary> CreateAsync(Salary salary)
    {
        ValidateSalaryInput(salary);

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        salary.SalaryMonth = NormalizeSalaryMonth(salary.SalaryMonth);

        var staff = await _context.Staff
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == salary.StaffId);

        if (staff is null)
        {
            throw new InvalidOperationException("Selected staff member does not exist.");
        }

        if (staff.BranchId <= 0)
        {
            throw new InvalidOperationException("Selected staff member is not assigned to a branch.");
        }

        // Branch Isolation Guard: User cannot create salary for staff of another branch
        staff.EnsureBranchAccess(userBranchId, isHeadOffice);

        // Force salary BranchId to staff's actual branch
        salary.BranchId = staff.BranchId;

        bool duplicate = await _context.Salaries
            .AnyAsync(x => x.StaffId == salary.StaffId && x.SalaryMonth == salary.SalaryMonth);

        if (duplicate)
        {
            throw new InvalidOperationException("Salary for this employee and month already exists.");
        }

        salary.NetSalary = salary.BasicSalary + salary.Allowances - salary.Deductions;
        salary.PaidAmount = 0;
        salary.RemainingAmount = salary.NetSalary;
        salary.Status = "Pending";
        salary.PaymentDate = null;

        _context.Salaries.Add(salary);
        await _context.SaveChangesAsync();

        return salary;
    }

    public async Task<bool> UpdateAsync(Salary salary)
    {
        ValidateSalaryInput(salary);

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        salary.SalaryMonth = NormalizeSalaryMonth(salary.SalaryMonth);

        var existingSalary = await _context.Salaries
            .FirstOrDefaultAsync(x => x.Id == salary.Id);

        if (existingSalary is null)
        {
            return false;
        }

        // IDOR Guard
        existingSalary.EnsureBranchAccess(userBranchId, isHeadOffice);

        if (existingSalary.PaidAmount > 0)
        {
            throw new InvalidOperationException("A salary with existing payment cannot be edited.");
        }

        var staff = await _context.Staff
            .FirstOrDefaultAsync(x => x.Id == salary.StaffId);

        if (staff is null)
        {
            throw new InvalidOperationException("Selected staff member does not exist.");
        }

        // Ensure the new target staff is also within the user's branch authorization scope
        staff.EnsureBranchAccess(userBranchId, isHeadOffice);

        bool duplicate = await _context.Salaries
            .AnyAsync(x =>
                x.Id != salary.Id &&
                x.StaffId == salary.StaffId &&
                x.SalaryMonth == salary.SalaryMonth);

        if (duplicate)
        {
            throw new InvalidOperationException("Salary for this employee and month already exists.");
        }

        existingSalary.StaffId = salary.StaffId;
        existingSalary.BranchId = staff.BranchId;
        existingSalary.SalaryMonth = salary.SalaryMonth;
        existingSalary.BasicSalary = salary.BasicSalary;
        existingSalary.Allowances = salary.Allowances;
        existingSalary.Deductions = salary.Deductions;
        existingSalary.NetSalary = salary.BasicSalary + salary.Allowances - salary.Deductions;
        existingSalary.PaidAmount = 0;
        existingSalary.RemainingAmount = existingSalary.NetSalary;
        existingSalary.Status = "Pending";
        existingSalary.PaymentDate = null;
        existingSalary.Notes = salary.Notes;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MakePaymentAsync(int salaryId, decimal paymentAmount, DateTime paymentDate)
    {
        if (paymentAmount <= 0)
        {
            throw new ArgumentException("Payment amount must be greater than zero.");
        }

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var salary = await _context.Salaries
            .FirstOrDefaultAsync(x => x.Id == salaryId);

        if (salary is null)
        {
            return false;
        }

        // Cross-Branch Payment Prevention
        salary.EnsureBranchAccess(userBranchId, isHeadOffice);

        if (salary.Status == "Paid")
        {
            throw new InvalidOperationException("This salary has already been fully paid.");
        }

        if (paymentAmount > salary.RemainingAmount)
        {
            throw new InvalidOperationException("Payment amount cannot be greater than the remaining salary.");
        }

        salary.PaidAmount += paymentAmount;
        salary.RemainingAmount = salary.NetSalary - salary.PaidAmount;
        salary.PaymentDate = paymentDate;

        salary.Status = salary.RemainingAmount == 0 ? "Paid" : "PartiallyPaid";

        await _context.SaveChangesAsync();
        return true;
    }

    private static void ValidateSalaryInput(Salary salary)
    {
        if (salary.StaffId <= 0)
        {
            throw new ArgumentException("Staff member is required.");
        }

        if (string.IsNullOrWhiteSpace(salary.SalaryMonth))
        {
            throw new ArgumentException("Salary month is required.");
        }

        if (salary.BasicSalary < 0)
        {
            throw new ArgumentException("Basic salary cannot be negative.");
        }

        if (salary.Allowances < 0)
        {
            throw new ArgumentException("Allowances cannot be negative.");
        }

        if (salary.Deductions < 0)
        {
            throw new ArgumentException("Deductions cannot be negative.");
        }

        decimal netSalary = salary.BasicSalary + salary.Allowances - salary.Deductions;
        if (netSalary <= 0)
        {
            throw new ArgumentException("Net salary must be greater than zero.");
        }
    }

    private static string NormalizeSalaryMonth(string salaryMonth)
    {
        if (!DateTime.TryParse(salaryMonth, out DateTime parsedDate))
        {
            throw new ArgumentException("Invalid salary month.");
        }

        return parsedDate.ToString("yyyy-MM");
    }
}