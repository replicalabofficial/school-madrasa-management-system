namespace SchoolMadrasaManagementSystem.Entities;

public class Salary
{
    public int Id { get; set; }

    public int StaffId { get; set; }

    public Staff Staff { get; set; } = null!;

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;

    // Store as YYYY-MM, e.g. 2026-09
    public string SalaryMonth { get; set; } = string.Empty;

    public decimal BasicSalary { get; set; }

    public decimal Allowances { get; set; }

    public decimal Deductions { get; set; }

    public decimal NetSalary { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal RemainingAmount { get; set; }

    public string Status { get; set; } = "Pending";

    public DateTime? PaymentDate { get; set; }

    public string? Notes { get; set; }
}