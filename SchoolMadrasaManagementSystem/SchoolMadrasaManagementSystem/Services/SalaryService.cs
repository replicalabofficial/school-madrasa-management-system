using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class SalaryService : ISalaryService
{
    private readonly AppDbContext _context;

    private static readonly string[] AllowedStatuses =
    {
        "Pending",
        "PartiallyPaid",
        "Paid"
    };

    public SalaryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Salary>> GetAllAsync()
    {
        return await _context.Salaries
            .Include(x => x.Staff)
            .Include(x => x.Branch)
            .OrderByDescending(x => x.SalaryMonth)
            .ThenBy(x => x.Staff.Name)
            .ToListAsync();
    }

    public async Task<Salary?> GetByIdAsync(int id)
    {
        return await _context.Salaries
            .Include(x => x.Staff)
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<Salary> CreateAsync(Salary salary)
    {
        ValidateSalaryInput(salary);

        salary.SalaryMonth = NormalizeSalaryMonth(
            salary.SalaryMonth);

        var staff = await _context.Staff
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == salary.StaffId);

        if (staff is null)
        {
            throw new InvalidOperationException(
                "Selected staff member does not exist.");
        }

        if (staff.BranchId <= 0)
        {
            throw new InvalidOperationException(
                "Selected staff member is not assigned to a branch.");
        }

        // Branch comes from the employee's actual branch.
        salary.BranchId = staff.BranchId;

        bool duplicate = await _context.Salaries
            .AnyAsync(x =>
                x.StaffId == salary.StaffId &&
                x.SalaryMonth == salary.SalaryMonth);

        if (duplicate)
        {
            throw new InvalidOperationException(
                "Salary for this employee and month already exists.");
        }

        salary.NetSalary =
            salary.BasicSalary +
            salary.Allowances -
            salary.Deductions;

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

        salary.SalaryMonth = NormalizeSalaryMonth(
            salary.SalaryMonth);

        var existingSalary = await _context.Salaries
            .FirstOrDefaultAsync(x => x.Id == salary.Id);

        if (existingSalary is null)
        {
            return false;
        }

        // Do not modify financial details after payment.
        if (existingSalary.PaidAmount > 0)
        {
            throw new InvalidOperationException(
                "A salary with existing payment cannot be edited.");
        }

        var staff = await _context.Staff
            .FirstOrDefaultAsync(x => x.Id == salary.StaffId);

        if (staff is null)
        {
            throw new InvalidOperationException(
                "Selected staff member does not exist.");
        }

        bool duplicate = await _context.Salaries
            .AnyAsync(x =>
                x.Id != salary.Id &&
                x.StaffId == salary.StaffId &&
                x.SalaryMonth == salary.SalaryMonth);

        if (duplicate)
        {
            throw new InvalidOperationException(
                "Salary for this employee and month already exists.");
        }

        existingSalary.StaffId = salary.StaffId;

        // Always use staff's actual branch.
        existingSalary.BranchId = staff.BranchId;

        existingSalary.SalaryMonth = salary.SalaryMonth;

        existingSalary.BasicSalary = salary.BasicSalary;

        existingSalary.Allowances = salary.Allowances;

        existingSalary.Deductions = salary.Deductions;

        existingSalary.NetSalary =
            salary.BasicSalary +
            salary.Allowances -
            salary.Deductions;

        existingSalary.PaidAmount = 0;

        existingSalary.RemainingAmount =
            existingSalary.NetSalary;

        existingSalary.Status = "Pending";

        existingSalary.PaymentDate = null;

        existingSalary.Notes = salary.Notes;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> MakePaymentAsync(
        int salaryId,
        decimal paymentAmount,
        DateTime paymentDate)
    {
        if (paymentAmount <= 0)
        {
            throw new ArgumentException(
                "Payment amount must be greater than zero.");
        }

        var salary = await _context.Salaries
            .FirstOrDefaultAsync(x => x.Id == salaryId);

        if (salary is null)
        {
            return false;
        }

        if (salary.Status == "Paid")
        {
            throw new InvalidOperationException(
                "This salary has already been fully paid.");
        }

        if (paymentAmount > salary.RemainingAmount)
        {
            throw new InvalidOperationException(
                "Payment amount cannot be greater than the remaining salary.");
        }

        salary.PaidAmount += paymentAmount;

        salary.RemainingAmount =
            salary.NetSalary - salary.PaidAmount;

        salary.PaymentDate = paymentDate;

        if (salary.RemainingAmount == 0)
        {
            salary.Status = "Paid";
        }
        else
        {
            salary.Status = "PartiallyPaid";
        }

        await _context.SaveChangesAsync();

        return true;
    }

    private static void ValidateSalaryInput(Salary salary)
    {
        if (salary.StaffId <= 0)
        {
            throw new ArgumentException(
                "Staff member is required.");
        }

        if (string.IsNullOrWhiteSpace(salary.SalaryMonth))
        {
            throw new ArgumentException(
                "Salary month is required.");
        }

        if (salary.BasicSalary < 0)
        {
            throw new ArgumentException(
                "Basic salary cannot be negative.");
        }

        if (salary.Allowances < 0)
        {
            throw new ArgumentException(
                "Allowances cannot be negative.");
        }

        if (salary.Deductions < 0)
        {
            throw new ArgumentException(
                "Deductions cannot be negative.");
        }

        decimal netSalary =
            salary.BasicSalary +
            salary.Allowances -
            salary.Deductions;

        if (netSalary <= 0)
        {
            throw new ArgumentException(
                "Net salary must be greater than zero.");
        }
    }

    private static string NormalizeSalaryMonth(
        string salaryMonth)
    {
        if (!DateTime.TryParse(
                salaryMonth,
                out DateTime parsedDate))
        {
            throw new ArgumentException(
                "Invalid salary month.");
        }

        return parsedDate.ToString("yyyy-MM");
    }
}