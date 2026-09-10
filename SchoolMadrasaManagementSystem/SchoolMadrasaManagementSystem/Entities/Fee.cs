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

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;
}