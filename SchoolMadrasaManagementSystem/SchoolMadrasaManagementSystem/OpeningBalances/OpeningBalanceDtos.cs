namespace SchoolMadrasaManagementSystem.OpeningBalances;

public class OpeningBalanceDto
{
    public int Id { get; set; }

    public int ChartOfAccountId { get; set; }

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;

    public int BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string EntryType { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public DateTime Date { get; set; }

    public string Description { get; set; } = string.Empty;
}

public class CreateOpeningBalanceDto
{
    public int ChartOfAccountId { get; set; }

    public int BranchId { get; set; }

    // "Debit" or "Credit"
    public string EntryType { get; set; } = "Debit";

    public decimal Amount { get; set; }

    public DateTime Date { get; set; }

    public string? Description { get; set; }
}