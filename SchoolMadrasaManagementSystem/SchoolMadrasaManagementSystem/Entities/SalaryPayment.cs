namespace SchoolMadrasaManagementSystem.Entities;

public class SalaryPayment
{
    public int Id { get; set; }
    public int SalaryId { get; set; }
    public Salary Salary { get; set; } = null!;
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public int ChartOfAccountId { get; set; }
    public ChartOfAccount ChartOfAccount { get; set; } = null!;
    public int SourceAccountId { get; set; }

    public bool IsReconciled { get; set; }
    public DateTime? ReconciledAt { get; set; }
    public ChartOfAccount SourceAccount { get; set; } = null!;
    public int BranchId { get; set; }
}