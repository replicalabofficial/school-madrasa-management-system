namespace SchoolMadrasaManagementSystem.Entities;

public class Fee
{
    public int Id { get; set; }

    public string SerialNumber { get; set; } = string.Empty;

    public int StudentId { get; set; }

    public Student Student { get; set; } = null!;

    public string Category { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string FeePeriod { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public string Status { get; set; } = "Pending";

    public string? Notes { get; set; }

    public string? Description { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? DiscountApprovalStatus { get; set; }

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;

    public int? ChartOfAccountId { get; set; }
    public ChartOfAccount? ChartOfAccount { get; set; }
    public int? SourceAccountId { get; set; }

    public DateTime? PaidDate { get; set; }
    public bool IsReconciled { get; set; }
    public DateTime? ReconciledAt { get; set; }
    public ChartOfAccount? SourceAccount { get; set; }

    // Set when the fee was created by a Monthly Fee Posting
    public int? FeePostingId { get; set; }
    public FeePosting? FeePosting { get; set; }
}