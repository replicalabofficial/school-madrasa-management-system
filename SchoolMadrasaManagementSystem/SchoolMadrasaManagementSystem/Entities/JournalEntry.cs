namespace SchoolMadrasaManagementSystem.Entities;

// Journal Voucher (manual entry) and system entries such as Year-end Closing.
public class JournalEntry
{
    public int Id { get; set; }

    // e.g. JV-00001 or YE-2026-06-30
    public string EntryNumber { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public string Description { get; set; } = string.Empty;

    // "Manual" or "YearEndClosing"
    public string EntryType { get; set; } = "Manual";

    public string? CreatedByUserId { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<JournalEntryLine> Lines { get; set; } = new();
}

public class JournalEntryLine
{
    public int Id { get; set; }

    public int JournalEntryId { get; set; }

    public JournalEntry JournalEntry { get; set; } = null!;

    public int ChartOfAccountId { get; set; }

    public ChartOfAccount ChartOfAccount { get; set; } = null!;

    // null = institution level (not tied to one branch)
    public int? BranchId { get; set; }

    public Branch? Branch { get; set; }

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public string Note { get; set; } = string.Empty;
}