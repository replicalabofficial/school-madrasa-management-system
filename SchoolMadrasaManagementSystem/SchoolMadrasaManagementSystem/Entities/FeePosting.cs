namespace SchoolMadrasaManagementSystem.Entities;

// One "Monthly Fee Posting" run (e.g. November 2026, Branch 002, all classes)
public class FeePosting
{
    public int Id { get; set; }

    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    public int Month { get; set; }          // 1-12
    public int Year { get; set; }
    public string? Class { get; set; }      // null = all classes
    public DateTime FeeDate { get; set; }

    public int StudentCount { get; set; }
    public decimal GrossTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal NetTotal { get; set; }

    public string PostedBy { get; set; } = string.Empty;
    public DateTime PostedAt { get; set; } = DateTime.UtcNow;
}
