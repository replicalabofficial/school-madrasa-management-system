namespace SchoolMadrasaManagementSystem.Entities;

public class TrialBalanceRowDto
{
    public int ChartOfAccountId { get; set; }
    public string AccountId { get; set; } = string.Empty;
    public string AccountDescription { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}

public class BalanceSheetLineDto
{
    public string AccountDescription { get; set; } = string.Empty;
    public decimal Balance { get; set; }
}

public class BalanceSheetDto
{
    public List<BalanceSheetLineDto> Assets { get; set; } = new();
    public List<BalanceSheetLineDto> Liabilities { get; set; } = new();
    public List<BalanceSheetLineDto> Equity { get; set; } = new();
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal TotalEquity { get; set; }
    public decimal TotalLiabilitiesAndEquity { get; set; }

    public class JournalLineDto
    {
        public int AccountId { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string SourceType { get; set; } = string.Empty;
        public int SourceId { get; set; }
        public bool IsReconciled { get; set; }
    }

    public class AgedReceivableRowDto
    {
        public int FeeId { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string FeePeriod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int DaysOutstanding { get; set; }
        public string AgingBucket { get; set; } = string.Empty;
    }

    public class IncomeStatementDto
    {
        public List<BalanceSheetLineDto> IncomeLines { get; set; } = new();
        public List<BalanceSheetLineDto> ExpenseLines { get; set; } = new();
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal NetIncome { get; set; }
    }
}