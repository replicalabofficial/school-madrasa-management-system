namespace SchoolMadrasaManagementSystem.Reports;

public class ReportFilter
{
    public DateTime? DateFrom { get; set; }

    public DateTime? DateTo { get; set; }

    public int? BranchId { get; set; }

    public string? AccountType { get; set; }

    public string? Category { get; set; }

    public string? Status { get; set; }
}