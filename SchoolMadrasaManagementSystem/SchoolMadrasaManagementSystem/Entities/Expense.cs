using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Entities;

public class Expense : IBranchEntity
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

    public int? SourceAccountId { get; set; }

    public bool IsReconciled { get; set; }
    public DateTime? ReconciledAt { get; set; }
    public ChartOfAccount? SourceAccount { get; set; }

    public string? Notes { get; set; }
}