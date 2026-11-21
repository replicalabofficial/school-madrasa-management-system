using SchoolMadrasaManagementSystem.Entities;
using static SchoolMadrasaManagementSystem.Entities.BalanceSheetDto;

namespace SchoolMadrasaManagementSystem.Ledger;

public class LedgerReportDto
{
    public int ChartOfAccountId { get; set; }

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;

    public DateTime? DateFrom { get; set; }

    public DateTime? DateTo { get; set; }

    // Balance before DateFrom
    public decimal OpeningBalance { get; set; }

    public decimal TotalDebit { get; set; }

    public decimal TotalCredit { get; set; }

    // Balance at the end of DateTo
    public decimal ClosingBalance { get; set; }

    public List<LedgerEntryDto> Entries { get; set; } = new();
}

public class LedgerAccountOptionDto
{
    public int Id { get; set; }

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;
}