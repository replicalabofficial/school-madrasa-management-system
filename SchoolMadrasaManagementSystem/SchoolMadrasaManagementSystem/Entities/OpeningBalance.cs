namespace SchoolMadrasaManagementSystem.Entities;

// Balance that already existed before EFAS was started (cash in hand, bank, old dues, assets, liabilities).
// Each record posts two ledger lines: the account (Debit or Credit) and "Opening Balance Equity" on the other side.
public class OpeningBalance
{
    public int Id { get; set; }

    public int ChartOfAccountId { get; set; }

    public ChartOfAccount ChartOfAccount { get; set; } = null!;

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;

    // "Debit" or "Credit"
    public string EntryType { get; set; } = "Debit";

    public decimal Amount { get; set; }

    public DateTime Date { get; set; }

    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}