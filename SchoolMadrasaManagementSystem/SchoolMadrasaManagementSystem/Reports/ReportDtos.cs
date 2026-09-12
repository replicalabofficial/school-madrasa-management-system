namespace SchoolMadrasaManagementSystem.Reports;

public class IncomeReportDto
{
    public int Id { get; set; }

    public DateTime Date { get; set; }

    public string Category { get; set; } = string.Empty;

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public int BranchId { get; set; }
}

public class ExpenseReportDto
{
    public int Id { get; set; }

    public DateTime Date { get; set; }

    public string Category { get; set; } = string.Empty;

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public int BranchId { get; set; }
}

public class FeeReportDto
{
    public int Id { get; set; }

    public string SerialNumber { get; set; } = string.Empty;

    public string StudentName { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string FeePeriod { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public string Status { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public int BranchId { get; set; }
}

public class SalaryReportDto
{
    public int Id { get; set; }

    public string StaffName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string SalaryMonth { get; set; } = string.Empty;

    public decimal BasicSalary { get; set; }

    public decimal Allowances { get; set; }

    public decimal Deductions { get; set; }

    public decimal NetSalary { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal RemainingAmount { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime? PaymentDate { get; set; }

    public int BranchId { get; set; }
}

public class BranchFinancialReportDto
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public decimal TotalFees { get; set; }

    public decimal TotalIncome { get; set; }

    public decimal TotalExpenses { get; set; }

    public decimal TotalSalary { get; set; }

    public decimal NetBalance { get; set; }


}

public class AccountFinancialReportDto
{
    public int ChartOfAccountId { get; set; }

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;

    public decimal TotalIncome { get; set; }

    public decimal TotalExpense { get; set; }

    public decimal NetAmount { get; set; }
}

public class ChartOfAccountReportDto
{
    public int Id { get; set; }

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}

public class MonthlyFinancialSummaryDto
{
    public string Month { get; set; } = string.Empty;

    public decimal TotalFees { get; set; }

    public decimal TotalIncome { get; set; }

    public decimal TotalExpenses { get; set; }

    public decimal TotalSalary { get; set; }

    public decimal NetBalance { get; set; }

}