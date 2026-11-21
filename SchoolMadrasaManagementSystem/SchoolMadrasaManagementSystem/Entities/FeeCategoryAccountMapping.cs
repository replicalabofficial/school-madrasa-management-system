namespace SchoolMadrasaManagementSystem.Entities;

public class FeeCategoryAccountMapping
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public int? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public int ChartOfAccountId { get; set; }
    public ChartOfAccount ChartOfAccount { get; set; } = null!;
}