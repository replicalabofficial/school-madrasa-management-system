namespace SchoolMadrasaManagementSystem.JournalEntries;

public class JournalEntryDto
{
    public int Id { get; set; }
    public string EntryNumber { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public string EntryType { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public List<JournalEntryLineDto> Lines { get; set; } = new();
}

public class JournalEntryLineDto
{
    public int Id { get; set; }
    public int ChartOfAccountId { get; set; }
    public string AccountId { get; set; } = string.Empty;
    public string AccountDescription { get; set; } = string.Empty;
    public int? BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string Note { get; set; } = string.Empty;
}

public class CreateJournalEntryDto
{
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<CreateJournalEntryLineDto> Lines { get; set; } = new();
}

public class CreateJournalEntryLineDto
{
    public int ChartOfAccountId { get; set; }
    public int? BranchId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string? Note { get; set; }
}