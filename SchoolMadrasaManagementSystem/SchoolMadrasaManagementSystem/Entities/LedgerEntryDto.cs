namespace SchoolMadrasaManagementSystem.Entities;

public class LedgerEntryDto
{
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal RunningBalance { get; set; }

    public string SourceType { get; set; } = string.Empty;
    public int SourceId { get; set; }
    public bool IsReconciled { get; set; }
}