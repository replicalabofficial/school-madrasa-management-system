namespace SchoolMadrasaManagementSystem.Entities;

public class Income
{
    public int Id { get; set; }

    public DateTime Date { get; set; }

    // Existing category kept for backward compatibility
    public string Category { get; set; } = string.Empty;

    public int ChartOfAccountId { get; set; }

    public ChartOfAccount ChartOfAccount { get; set; } = null!;

    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;

    public string? Notes { get; set; }
}