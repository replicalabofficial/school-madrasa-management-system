namespace SchoolMadrasaManagementSystem.PeriodClosing;

public class PeriodLockDto
{
    public DateTime? LockedUpTo { get; set; }
    public string UpdatedByName { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
}

public class SetPeriodLockRequest
{
    // null = remove the lock
    public DateTime? LockedUpTo { get; set; }
}

public class YearEndPreviewDto
{
    public DateTime YearEndDate { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetIncome { get; set; }
    public List<YearEndLineDto> Lines { get; set; } = new();
}

public class YearEndLineDto
{
    public string AccountId { get; set; } = string.Empty;
    public string AccountDescription { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    // Positive = income, negative = expense for display
    public decimal Amount { get; set; }
}

public class CloseYearRequest
{
    public DateTime YearEndDate { get; set; }
    public bool LockBooks { get; set; } = true;
}