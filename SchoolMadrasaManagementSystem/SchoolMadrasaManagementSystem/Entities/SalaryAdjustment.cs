namespace SchoolMadrasaManagementSystem.Entities;

public class SalaryAdjustment
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public Staff Staff { get; set; } = null!;
    public int BranchId { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int ChartOfAccountId { get; set; }
    public ChartOfAccount ChartOfAccount { get; set; } = null!;
    public int SourceAccountId { get; set; }
    public ChartOfAccount SourceAccount { get; set; } = null!;
}