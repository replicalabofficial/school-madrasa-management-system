using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Dashboard;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Security;
namespace SchoolMadrasaManagementSystem.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _securityContext;

    public DashboardService(AppDbContext context, IBranchSecurityContext securityContext)
    {
        _context = context;
        _securityContext = securityContext;
    }

    // Raw money movements for one branch, or all branches (branchId = null)
    private sealed record MoneyRow(int BranchId, DateTime Date, decimal Amount, string Category);

    private sealed class FinanceData
    {
        public List<MoneyRow> OtherIncome { get; init; } = new();
        public List<MoneyRow> FeesCollected { get; init; } = new();
        public List<MoneyRow> Expenses { get; init; } = new();
        public List<MoneyRow> SalariesPaid { get; init; } = new();
        public decimal FeesBilled { get; init; }
        public decimal OutstandingFees { get; init; }
        public decimal UnpaidSalaries { get; init; }
    }

    private async Task<FinanceData> LoadFinanceAsync(int? branchId, DashboardFilter filter)
    {
        DateTime? from = filter.DateFrom?.Date;
        DateTime? toExclusive = filter.DateTo?.Date.AddDays(1);

        var income = _context.Income.AsNoTracking().AsQueryable();
        var expenses = _context.Expenses.AsNoTracking().AsQueryable();
        var fees = _context.Fees.AsNoTracking().AsQueryable();
        var salaryPayments = _context.SalaryPayments.AsNoTracking().AsQueryable();
        var salaryAdjustments = _context.SalaryAdjustments.AsNoTracking().AsQueryable();
        var salaries = _context.Salaries.AsNoTracking().AsQueryable();

        if (branchId.HasValue)
        {
            var id = branchId.Value;
            income = income.Where(x => x.BranchId == id);
            expenses = expenses.Where(x => x.BranchId == id);
            fees = fees.Where(x => x.BranchId == id);
            salaryPayments = salaryPayments.Where(x => x.BranchId == id);
            salaryAdjustments = salaryAdjustments.Where(x => x.BranchId == id);
            salaries = salaries.Where(x => x.BranchId == id);
        }

        if (from.HasValue)
        {
            income = income.Where(x => x.Date >= from.Value);
            expenses = expenses.Where(x => x.Date >= from.Value);
            salaryPayments = salaryPayments.Where(x => x.PaymentDate >= from.Value);
            salaryAdjustments = salaryAdjustments.Where(x => x.Date >= from.Value);
        }

        if (toExclusive.HasValue)
        {
            income = income.Where(x => x.Date < toExclusive.Value);
            expenses = expenses.Where(x => x.Date < toExclusive.Value);
            salaryPayments = salaryPayments.Where(x => x.PaymentDate < toExclusive.Value);
            salaryAdjustments = salaryAdjustments.Where(x => x.Date < toExclusive.Value);
        }

        // Fees billed in the period (by fee date)
        var billed = fees;
        if (from.HasValue) billed = billed.Where(x => x.Date >= from.Value);
        if (toExclusive.HasValue) billed = billed.Where(x => x.Date < toExclusive.Value);

        // Fees collected in the period (by paid date)
        var paid = fees.Where(x => x.Status == "Paid");
        if (from.HasValue) paid = paid.Where(x => (x.PaidDate ?? x.Date) >= from.Value);
        if (toExclusive.HasValue) paid = paid.Where(x => (x.PaidDate ?? x.Date) < toExclusive.Value);

        var otherIncome = await income
            .Select(x => new MoneyRow(x.BranchId, x.Date, x.Amount, x.Category))
            .ToListAsync();

        var feesCollected = await paid
            .Select(x => new MoneyRow(x.BranchId, x.PaidDate ?? x.Date, (x.Amount - (x.DiscountApprovalStatus == "Approved" ? x.DiscountAmount : 0)), "Fee: " + x.Category))
            .ToListAsync();

        var expenseRows = await expenses
            .Select(x => new MoneyRow(x.BranchId, x.Date, x.Amount, x.Category))
            .ToListAsync();

        var salaryRows = await salaryPayments
            .Select(x => new MoneyRow(x.BranchId, x.PaymentDate, x.Amount, "Salaries"))
            .ToListAsync();

        salaryRows.AddRange(await salaryAdjustments
            .Select(x => new MoneyRow(x.BranchId, x.Date, x.Amount, "Salaries"))
            .ToListAsync());

        var feesBilled = await billed.SumAsync(x => (decimal?)(x.Amount - (x.DiscountApprovalStatus == "Approved" ? x.DiscountAmount : 0))) ?? 0;

        var outstandingFees = await billed
            .Where(x => x.Status != "Paid")
            .SumAsync(x => (decimal?)(x.Amount - (x.DiscountApprovalStatus == "Approved" ? x.DiscountAmount : 0))) ?? 0;

        var unpaidSalaries = await salaries
            .Where(x => x.Status == "Pending" || x.Status == "PartiallyPaid")
            .SumAsync(x => (decimal?)x.RemainingAmount) ?? 0;

        return new FinanceData
        {
            OtherIncome = otherIncome,
            FeesCollected = feesCollected,
            Expenses = expenseRows,
            SalariesPaid = salaryRows,
            FeesBilled = feesBilled,
            OutstandingFees = outstandingFees,
            UnpaidSalaries = unpaidSalaries,
        };
    }

    public async Task<HeadOfficeDashboardDto> GetHeadOfficeDashboardAsync(DashboardFilter filter)
    {
        if (!_securityContext.IsHeadOffice)
        {
            throw new UnauthorizedAccessException("Unauthorized: Head Office Dashboard is restricted to Head Office users.");
        }

        var branchId = filter.BranchId;

        // Only students currently studying (passed out / left are excluded)
        var studentsQuery = _context.Students.AsNoTracking().Where(x => x.IsActive);
        var staffQuery = _context.Staff.AsNoTracking().AsQueryable();
        var branchesQuery = _context.Branches.AsNoTracking().AsQueryable();

        if (branchId.HasValue)
        {
            studentsQuery = studentsQuery.Where(x => x.BranchId == branchId.Value);
            staffQuery = staffQuery.Where(x => x.BranchId == branchId.Value);
            branchesQuery = branchesQuery.Where(x => x.Id == branchId.Value);
        }

        var data = await LoadFinanceAsync(branchId, filter);

        var otherIncome = data.OtherIncome.Sum(x => x.Amount);
        var feesCollected = data.FeesCollected.Sum(x => x.Amount);
        var operatingExpenses = data.Expenses.Sum(x => x.Amount);
        var salariesPaid = data.SalariesPaid.Sum(x => x.Amount);

        var totalIncome = otherIncome + feesCollected;
        var totalExpenses = operatingExpenses + salariesPaid;

        var incomeOverview = data.OtherIncome
            .Concat(data.FeesCollected)
            .GroupBy(x => x.Category)
            .Select(g => new DashboardCategoryDto { Category = g.Key, Amount = g.Sum(x => x.Amount) })
            .OrderByDescending(x => x.Amount)
            .ToList();

        var expenseOverview = data.Expenses
            .Concat(data.SalariesPaid)
            .GroupBy(x => x.Category)
            .Select(g => new DashboardCategoryDto { Category = g.Key, Amount = g.Sum(x => x.Amount) })
            .OrderByDescending(x => x.Amount)
            .ToList();

        var incomeRows = data.OtherIncome.Concat(data.FeesCollected).ToList();
        var expenseRows = data.Expenses.Concat(data.SalariesPaid).ToList();

        var monthlyIncomeVsExpense = incomeRows.Select(x => x.Date.ToString("yyyy-MM"))
            .Concat(expenseRows.Select(x => x.Date.ToString("yyyy-MM")))
            .Distinct()
            .OrderBy(x => x)
            .Select(month =>
            {
                var inc = incomeRows.Where(x => x.Date.ToString("yyyy-MM") == month).Sum(x => x.Amount);
                var exp = expenseRows.Where(x => x.Date.ToString("yyyy-MM") == month).Sum(x => x.Amount);
                return new MonthlyDashboardDto { Month = month, Income = inc, Expenses = exp, NetBalance = inc - exp };
            })
            .ToList();

        var branches = await branchesQuery.OrderBy(x => x.Name).ToListAsync();

        var branchFinancialOverview = branches.Select(branch =>
        {
            var inc = data.OtherIncome.Where(x => x.BranchId == branch.Id).Sum(x => x.Amount);
            var fee = data.FeesCollected.Where(x => x.BranchId == branch.Id).Sum(x => x.Amount);
            var exp = data.Expenses.Where(x => x.BranchId == branch.Id).Sum(x => x.Amount);
            var sal = data.SalariesPaid.Where(x => x.BranchId == branch.Id).Sum(x => x.Amount);

            return new BranchDashboardFinancialDto
            {
                BranchId = branch.Id,
                BranchName = branch.Name,
                Income = inc,
                Fees = fee,
                Expenses = exp,
                Salaries = sal,
                NetBalance = inc + fee - exp - sal,
            };
        }).ToList();

        var recentExpensesQuery = _context.Expenses.AsNoTracking().AsQueryable();
        if (branchId.HasValue) recentExpensesQuery = recentExpensesQuery.Where(x => x.BranchId == branchId.Value);
        if (filter.DateFrom.HasValue) recentExpensesQuery = recentExpensesQuery.Where(x => x.Date >= filter.DateFrom.Value.Date);
        if (filter.DateTo.HasValue) recentExpensesQuery = recentExpensesQuery.Where(x => x.Date < filter.DateTo.Value.Date.AddDays(1));

        var recentExpenses = await recentExpensesQuery
            .OrderByDescending(x => x.Date)
            .Take(10)
            .Select(x => new RecentExpenseDto
            {
                Id = x.Id,
                Date = x.Date,
                Category = x.Category,
                Amount = x.Amount,
                Description = x.Description,
                BranchName = x.Branch.Name
            })
            .ToListAsync();

        return new HeadOfficeDashboardDto
        {
            TotalBranches = branches.Count,
            TotalStudents = await studentsQuery.CountAsync(),
            TotalStaff = await staffQuery.CountAsync(),
            OtherIncome = otherIncome,
            FeesCollected = feesCollected,
            TotalIncome = totalIncome,
            OperatingExpenses = operatingExpenses,
            SalariesPaid = salariesPaid,
            TotalExpenses = totalExpenses,
            TotalSalaries = salariesPaid,
            OutstandingFees = data.OutstandingFees,
            UnpaidSalaries = data.UnpaidSalaries,
            NetBalance = totalIncome - totalExpenses,
            IncomeOverview = incomeOverview,
            ExpenseOverview = expenseOverview,
            MonthlyIncomeVsExpense = monthlyIncomeVsExpense,
            BranchFinancialOverview = branchFinancialOverview,
            RecentExpenses = recentExpenses
        };
    }

    public async Task<BranchDashboardDto?> GetBranchDashboardAsync(int branchId, DashboardFilter filter)
    {
        _securityContext.EnsureBranchAccess(branchId);

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == branchId);

        if (branch is null)
        {
            return null;
        }

        var data = await LoadFinanceAsync(branchId, filter);

        var otherIncome = data.OtherIncome.Sum(x => x.Amount);
        var feesCollected = data.FeesCollected.Sum(x => x.Amount);
        var operatingExpenses = data.Expenses.Sum(x => x.Amount);
        var salariesPaid = data.SalariesPaid.Sum(x => x.Amount);

        var totalIncome = otherIncome + feesCollected;
        var totalExpenses = operatingExpenses + salariesPaid;

        return new BranchDashboardDto
        {
            BranchId = branch.Id,
            BranchName = branch.Name,
            TotalStudents = await _context.Students.AsNoTracking().CountAsync(x => x.BranchId == branchId && x.IsActive),
            TotalStaff = await _context.Staff.AsNoTracking().CountAsync(x => x.BranchId == branchId),
            TotalFees = data.FeesBilled,
            FeesCollected = feesCollected,
            OutstandingFees = data.OutstandingFees,
            OtherIncome = otherIncome,
            TotalIncome = totalIncome,
            OperatingExpenses = operatingExpenses,
            SalariesPaid = salariesPaid,
            TotalExpenses = totalExpenses,
            UnpaidSalaries = data.UnpaidSalaries,
            NetBalance = totalIncome - totalExpenses
        };
    }

    public async Task<StudentAdmissionStatsDto> GetStudentAdmissionStatsAsync()
    {
        var students = await _context.Students
            .AsNoTracking()
            .ApplyBranchFilter(_securityContext)
            .ToListAsync();

        var currentYear = DateTime.UtcNow.Year;
        var tenDaysAgo = DateTime.UtcNow.Date.AddDays(-10);

        return new StudentAdmissionStatsDto
        {
            NewAdmissionsThisYear = students.Count(s => s.CreatedAt.Year == currentYear),
            LeftThisYear = students.Count(s => s.LeftDate.HasValue && s.LeftDate.Value.Year == currentYear),
            NewAdmissionsLastYear = students.Count(s => s.CreatedAt.Year == currentYear - 1),
            LeftLastYear = students.Count(s => s.LeftDate.HasValue && s.LeftDate.Value.Year == currentYear - 1),
            RecentAdmissions = students
                .Where(s => s.CreatedAt.Date >= tenDaysAgo)
                .Select(s => new NewAdmissionDto { StudentId = s.Id, Name = s.Name, CreatedAt = s.CreatedAt })
                .ToList(),
        };
    }
}