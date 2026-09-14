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

    public async Task<HeadOfficeDashboardDto> GetHeadOfficeDashboardAsync(DashboardFilter filter)
    {
        // Strict HeadOffice check for Head Office Overview
        if (!_securityContext.IsHeadOffice)
        {
            throw new UnauthorizedAccessException("Unauthorized: Head Office Dashboard is restricted to Head Office users.");
        }

        var studentsQuery = _context.Students.AsNoTracking().ApplyBranchFilter(_securityContext, filter.BranchId);
        var staffQuery = _context.Staff.AsNoTracking().ApplyBranchFilter(_securityContext, filter.BranchId);
        var branchesQuery = _context.Branches.AsNoTracking().AsQueryable();

        var incomeQuery = _context.Income
            .AsNoTracking()
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        var expenseQuery = _context.Expenses
            .AsNoTracking()
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        var feeQuery = _context.Fees
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        var salaryQuery = _context.Salaries
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        if (filter.DateFrom.HasValue)
        {
            incomeQuery = incomeQuery.Where(x => x.Date >= filter.DateFrom.Value);
            expenseQuery = expenseQuery.Where(x => x.Date >= filter.DateFrom.Value);
            feeQuery = feeQuery.Where(x => x.Date >= filter.DateFrom.Value);
        }

        if (filter.DateTo.HasValue)
        {
            var dateTo = filter.DateTo.Value.Date.AddDays(1);
            incomeQuery = incomeQuery.Where(x => x.Date < dateTo);
            expenseQuery = expenseQuery.Where(x => x.Date < dateTo);
            feeQuery = feeQuery.Where(x => x.Date < dateTo);
        }

        var totalBranches = filter.BranchId.HasValue
            ? await branchesQuery.CountAsync(x => x.Id == filter.BranchId.Value)
            : await branchesQuery.CountAsync();

        var totalStudents = await studentsQuery.CountAsync();
        var totalStaff = await staffQuery.CountAsync();

        var totalIncome = await incomeQuery.SumAsync(x => (decimal?)x.Amount) ?? 0;
        var totalExpenses = await expenseQuery.SumAsync(x => (decimal?)x.Amount) ?? 0;
        var totalSalaries = await salaryQuery.SumAsync(x => (decimal?)x.NetSalary) ?? 0;

        var outstandingFees = await feeQuery
            .Where(x => x.Status == "Pending" || x.Status == "Outstanding")
            .SumAsync(x => (decimal?)x.Amount) ?? 0;

        var unpaidSalaries = await salaryQuery
            .Where(x => x.Status == "Pending" || x.Status == "PartiallyPaid")
            .SumAsync(x => (decimal?)x.RemainingAmount) ?? 0;

        var incomeOverview = await incomeQuery
            .GroupBy(x => x.Category)
            .Select(g => new DashboardCategoryDto
            {
                Category = g.Key,
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        var expenseOverview = await expenseQuery
            .GroupBy(x => x.Category)
            .Select(g => new DashboardCategoryDto
            {
                Category = g.Key,
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        var incomeRecords = await incomeQuery.Select(x => new { x.Date, x.Amount }).ToListAsync();
        var expenseRecords = await expenseQuery.Select(x => new { x.Date, x.Amount }).ToListAsync();

        var months = incomeRecords
            .Select(x => x.Date.ToString("yyyy-MM"))
            .Concat(expenseRecords.Select(x => x.Date.ToString("yyyy-MM")))
            .Distinct()
            .OrderBy(x => x)
            .ToList();

        var monthlyIncomeVsExpense = months
            .Select(month =>
            {
                var income = incomeRecords.Where(x => x.Date.ToString("yyyy-MM") == month).Sum(x => x.Amount);
                var expenses = expenseRecords.Where(x => x.Date.ToString("yyyy-MM") == month).Sum(x => x.Amount);

                return new MonthlyDashboardDto
                {
                    Month = month,
                    Income = income,
                    Expenses = expenses,
                    NetBalance = income - expenses
                };
            })
            .ToList();

        var branches = await branchesQuery.OrderBy(x => x.Name).ToListAsync();
        var branchFinancialOverview = new List<BranchDashboardFinancialDto>();

        foreach (var branch in branches)
        {
            var branchIncome = await _context.Income
                .AsNoTracking()
                .Where(x => x.BranchId == branch.Id)
                .Where(x => !filter.DateFrom.HasValue || x.Date >= filter.DateFrom.Value)
                .Where(x => !filter.DateTo.HasValue || x.Date < filter.DateTo.Value.Date.AddDays(1))
                .SumAsync(x => (decimal?)x.Amount) ?? 0;

            var branchExpenses = await _context.Expenses
                .AsNoTracking()
                .Where(x => x.BranchId == branch.Id)
                .Where(x => !filter.DateFrom.HasValue || x.Date >= filter.DateFrom.Value)
                .Where(x => !filter.DateTo.HasValue || x.Date < filter.DateTo.Value.Date.AddDays(1))
                .SumAsync(x => (decimal?)x.Amount) ?? 0;

            var branchFees = await _context.Fees
                .AsNoTracking()
                .Where(x => x.BranchId == branch.Id)
                .Where(x => !filter.DateFrom.HasValue || x.Date >= filter.DateFrom.Value)
                .Where(x => !filter.DateTo.HasValue || x.Date < filter.DateTo.Value.Date.AddDays(1))
                .SumAsync(x => (decimal?)x.Amount) ?? 0;

            var branchSalaries = await _context.Salaries
                .AsNoTracking()
                .Where(x => x.BranchId == branch.Id)
                .SumAsync(x => (decimal?)x.NetSalary) ?? 0;

            branchFinancialOverview.Add(new BranchDashboardFinancialDto
            {
                BranchId = branch.Id,
                BranchName = branch.Name,
                Income = branchIncome,
                Expenses = branchExpenses,
                Salaries = branchSalaries,
                Fees = branchFees,
                NetBalance = branchIncome + branchFees - branchExpenses - branchSalaries
            });
        }

        var recentExpenses = await expenseQuery
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
            TotalBranches = totalBranches,
            TotalStudents = totalStudents,
            TotalStaff = totalStaff,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            TotalSalaries = totalSalaries,
            OutstandingFees = outstandingFees,
            UnpaidSalaries = unpaidSalaries,
            NetBalance = totalIncome + (await feeQuery.SumAsync(x => (decimal?)x.Amount) ?? 0) - totalExpenses - totalSalaries,
            IncomeOverview = incomeOverview,
            ExpenseOverview = expenseOverview,
            MonthlyIncomeVsExpense = monthlyIncomeVsExpense,
            BranchFinancialOverview = branchFinancialOverview,
            RecentExpenses = recentExpenses
        };
    }

    public async Task<BranchDashboardDto?> GetBranchDashboardAsync(int branchId, DashboardFilter filter)
    {
        // Validating tenant boundary
        _securityContext.EnsureBranchAccess(branchId);

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == branchId);

        if (branch is null)
        {
            return null;
        }

        var studentsQuery = _context.Students.AsNoTracking().Where(x => x.BranchId == branchId);
        var staffQuery = _context.Staff.AsNoTracking().Where(x => x.BranchId == branchId);
        var feesQuery = _context.Fees.AsNoTracking().Where(x => x.BranchId == branchId);
        var incomeQuery = _context.Income.AsNoTracking().Where(x => x.BranchId == branchId);
        var expenseQuery = _context.Expenses.AsNoTracking().Where(x => x.BranchId == branchId);

        if (filter.DateFrom.HasValue)
        {
            feesQuery = feesQuery.Where(x => x.Date >= filter.DateFrom.Value);
            incomeQuery = incomeQuery.Where(x => x.Date >= filter.DateFrom.Value);
            expenseQuery = expenseQuery.Where(x => x.Date >= filter.DateFrom.Value);
        }

        if (filter.DateTo.HasValue)
        {
            var dateTo = filter.DateTo.Value.Date.AddDays(1);
            feesQuery = feesQuery.Where(x => x.Date < dateTo);
            incomeQuery = incomeQuery.Where(x => x.Date < dateTo);
            expenseQuery = expenseQuery.Where(x => x.Date < dateTo);
        }

        var totalStudents = await studentsQuery.CountAsync();
        var totalStaff = await staffQuery.CountAsync();
        var totalFees = await feesQuery.SumAsync(x => (decimal?)x.Amount) ?? 0;

        var outstandingFees = await feesQuery
            .Where(x => x.Status == "Pending" || x.Status == "Outstanding")
            .SumAsync(x => (decimal?)x.Amount) ?? 0;

        var totalIncome = await incomeQuery.SumAsync(x => (decimal?)x.Amount) ?? 0;
        var totalExpenses = await expenseQuery.SumAsync(x => (decimal?)x.Amount) ?? 0;

        return new BranchDashboardDto
        {
            BranchId = branch.Id,
            BranchName = branch.Name,
            TotalStudents = totalStudents,
            TotalStaff = totalStaff,
            TotalFees = totalFees,
            OutstandingFees = outstandingFees,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            NetBalance = totalIncome + totalFees - totalExpenses
        };
    }
}