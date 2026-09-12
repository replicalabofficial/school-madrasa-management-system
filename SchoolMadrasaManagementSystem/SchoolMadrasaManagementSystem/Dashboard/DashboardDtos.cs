namespace SchoolMadrasaManagementSystem.Dashboard;

public class HeadOfficeDashboardDto
{
    public int TotalBranches { get; set; }

    public int TotalStudents { get; set; }

    public int TotalStaff { get; set; }

    public decimal TotalIncome { get; set; }

    public decimal TotalExpenses { get; set; }

    public decimal TotalSalaries { get; set; }

    public decimal OutstandingFees { get; set; }

    public decimal UnpaidSalaries { get; set; }

    public decimal NetBalance { get; set; }

    public List<DashboardCategoryDto> IncomeOverview { get; set; } = new();

    public List<DashboardCategoryDto> ExpenseOverview { get; set; } = new();

    public List<MonthlyDashboardDto> MonthlyIncomeVsExpense { get; set; } = new();

    public List<BranchDashboardFinancialDto> BranchFinancialOverview { get; set; } = new();

    public List<RecentExpenseDto> RecentExpenses { get; set; } = new();
}


public class BranchDashboardDto
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public int TotalStudents { get; set; }

    public int TotalStaff { get; set; }

    public decimal TotalFees { get; set; }

    public decimal OutstandingFees { get; set; }

    public decimal TotalIncome { get; set; }

    public decimal TotalExpenses { get; set; }

    public decimal NetBalance { get; set; }
}


public class DashboardCategoryDto
{
    public string Category { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}


public class MonthlyDashboardDto
{
    public string Month { get; set; } = string.Empty;

    public decimal Income { get; set; }

    public decimal Expenses { get; set; }

    public decimal NetBalance { get; set; }
}


public class BranchDashboardFinancialDto
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public decimal Income { get; set; }

    public decimal Expenses { get; set; }

    public decimal Salaries { get; set; }

    public decimal Fees { get; set; }

    public decimal NetBalance { get; set; }
}


public class RecentExpenseDto
{
    public int Id { get; set; }

    public DateTime Date { get; set; }

    public string Category { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;
}