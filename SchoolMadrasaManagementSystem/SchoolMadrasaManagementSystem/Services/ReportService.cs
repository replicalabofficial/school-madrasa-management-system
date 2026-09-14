using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Reports;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _securityContext;

    public ReportService(AppDbContext context, IBranchSecurityContext securityContext)
    {
        _context = context;
        _securityContext = securityContext;
    }

    public async Task<List<IncomeReportDto>> GetIncomeReportAsync(ReportFilter filter)
    {
        var query = _context.Income
            .AsNoTracking()
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        if (filter.DateFrom.HasValue)
        {
            query = query.Where(x => x.Date >= filter.DateFrom.Value);
        }

        if (filter.DateTo.HasValue)
        {
            var dateTo = filter.DateTo.Value.Date.AddDays(1);
            query = query.Where(x => x.Date < dateTo);
        }

        if (!string.IsNullOrWhiteSpace(filter.AccountType))
        {
            query = query.Where(x => x.ChartOfAccount.AccountType == filter.AccountType);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            query = query.Where(x => x.Category == filter.Category);
        }

        return await query
            .OrderByDescending(x => x.Date)
            .Select(x => new IncomeReportDto
            {
                Id = x.Id,
                Date = x.Date,
                Category = x.Category,
                AccountId = x.ChartOfAccount.AccountId,
                AccountDescription = x.ChartOfAccount.AccountDescription,
                Amount = x.Amount,
                Description = x.Description,
                BranchName = x.Branch.Name,
                BranchId = x.BranchId
            })
            .ToListAsync();
    }

    public async Task<List<ExpenseReportDto>> GetExpenseReportAsync(ReportFilter filter)
    {
        var query = _context.Expenses
            .AsNoTracking()
            .Include(x => x.ChartOfAccount)
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        if (filter.DateFrom.HasValue)
        {
            query = query.Where(x => x.Date >= filter.DateFrom.Value);
        }

        if (filter.DateTo.HasValue)
        {
            var dateTo = filter.DateTo.Value.Date.AddDays(1);
            query = query.Where(x => x.Date < dateTo);
        }

        if (!string.IsNullOrWhiteSpace(filter.AccountType))
        {
            query = query.Where(x => x.ChartOfAccount.AccountType == filter.AccountType);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            query = query.Where(x => x.Category == filter.Category);
        }

        return await query
            .OrderByDescending(x => x.Date)
            .Select(x => new ExpenseReportDto
            {
                Id = x.Id,
                Date = x.Date,
                Category = x.Category,
                AccountId = x.ChartOfAccount.AccountId,
                AccountDescription = x.ChartOfAccount.AccountDescription,
                Amount = x.Amount,
                Description = x.Description,
                BranchName = x.Branch.Name,
                BranchId = x.BranchId
            })
            .ToListAsync();
    }

    public async Task<List<FeeReportDto>> GetFeeReportAsync(ReportFilter filter)
    {
        var query = _context.Fees
            .AsNoTracking()
            .Include(x => x.Student)
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        if (filter.DateFrom.HasValue)
        {
            query = query.Where(x => x.Date >= filter.DateFrom.Value);
        }

        if (filter.DateTo.HasValue)
        {
            var dateTo = filter.DateTo.Value.Date.AddDays(1);
            query = query.Where(x => x.Date < dateTo);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            query = query.Where(x => x.Category == filter.Category);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(x => x.Status == filter.Status);
        }

        return await query
            .OrderByDescending(x => x.Date)
            .Select(x => new FeeReportDto
            {
                Id = x.Id,
                SerialNumber = x.SerialNumber,
                StudentName = x.Student.Name,
                Category = x.Category,
                Amount = x.Amount,
                FeePeriod = x.FeePeriod,
                Date = x.Date,
                Status = x.Status,
                BranchName = x.Branch.Name,
                BranchId = x.BranchId
            })
            .ToListAsync();
    }

    public async Task<List<SalaryReportDto>> GetSalaryReportAsync(ReportFilter filter)
    {
        var query = _context.Salaries
            .AsNoTracking()
            .Include(x => x.Staff)
            .Include(x => x.Branch)
            .ApplyBranchFilter(_securityContext, filter.BranchId);

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(x => x.Status == filter.Status);
        }

        if (filter.DateFrom.HasValue)
        {
            var monthFrom = filter.DateFrom.Value.ToString("yyyy-MM");
            query = query.Where(x => string.Compare(x.SalaryMonth, monthFrom, StringComparison.Ordinal) >= 0);
        }

        if (filter.DateTo.HasValue)
        {
            var monthTo = filter.DateTo.Value.ToString("yyyy-MM");
            query = query.Where(x => string.Compare(x.SalaryMonth, monthTo, StringComparison.Ordinal) <= 0);
        }

        return await query
            .OrderByDescending(x => x.SalaryMonth)
            .ThenBy(x => x.Staff.Name)
            .Select(x => new SalaryReportDto
            {
                Id = x.Id,
                StaffName = x.Staff.Name,
                BranchName = x.Branch.Name,
                SalaryMonth = x.SalaryMonth,
                BasicSalary = x.BasicSalary,
                Allowances = x.Allowances,
                Deductions = x.Deductions,
                NetSalary = x.NetSalary,
                PaidAmount = x.PaidAmount,
                RemainingAmount = x.RemainingAmount,
                Status = x.Status,
                PaymentDate = x.PaymentDate,
                BranchId = x.BranchId
            })
            .ToListAsync();
    }

    public async Task<List<BranchFinancialReportDto>> GetBranchFinancialReportAsync(ReportFilter filter)
    {
        var branchesQuery = _context.Branches
            .AsNoTracking()
            .AsQueryable();

        if (!_securityContext.IsHeadOffice)
        {
            var userBranchId = _securityContext.GetRequiredBranchId();
            branchesQuery = branchesQuery.Where(x => x.Id == userBranchId);
        }
        else if (filter.BranchId.HasValue)
        {
            branchesQuery = branchesQuery.Where(x => x.Id == filter.BranchId.Value);
        }

        var branches = await branchesQuery
            .OrderBy(x => x.Name)
            .ToListAsync();

        var incomes = await GetIncomeReportAsync(filter);
        var expenses = await GetExpenseReportAsync(filter);
        var fees = await GetFeeReportAsync(filter);
        var salaries = await GetSalaryReportAsync(filter);

        return branches.Select(branch =>
        {
            var income = incomes
                .Where(x => x.BranchName == branch.Name)
                .Sum(x => x.Amount);

            var expense = expenses
                .Where(x => x.BranchName == branch.Name)
                .Sum(x => x.Amount);

            var fee = fees
                .Where(x => x.BranchName == branch.Name)
                .Sum(x => x.Amount);

            var salary = salaries
                .Where(x => x.BranchName == branch.Name)
                .Sum(x => x.NetSalary);

            return new BranchFinancialReportDto
            {
                BranchId = branch.Id,
                BranchName = branch.Name,
                TotalFees = fee,
                TotalIncome = income,
                TotalExpenses = expense,
                TotalSalary = salary,
                NetBalance = income + fee - expense - salary
            };
        }).ToList();
    }

    public async Task<List<AccountFinancialReportDto>> GetAccountFinancialReportAsync(ReportFilter filter)
    {
        var accountsQuery = _context.ChartOfAccounts
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.AccountType))
        {
            accountsQuery = accountsQuery.Where(x => x.AccountType == filter.AccountType);
        }

        var accounts = await accountsQuery
            .OrderBy(x => x.AccountId)
            .ToListAsync();

        var incomes = await GetIncomeReportAsync(filter);
        var expenses = await GetExpenseReportAsync(filter);

        return accounts.Select(account =>
        {
            var income = incomes
                .Where(x => x.AccountId == account.AccountId)
                .Sum(x => x.Amount);

            var expense = expenses
                .Where(x => x.AccountId == account.AccountId)
                .Sum(x => x.Amount);

            return new AccountFinancialReportDto
            {
                ChartOfAccountId = account.Id,
                AccountId = account.AccountId,
                AccountDescription = account.AccountDescription,
                AccountType = account.AccountType,
                TotalIncome = income,
                TotalExpense = expense,
                NetAmount = income - expense
            };
        }).ToList();
    }

    public async Task<List<ChartOfAccountReportDto>> GetChartOfAccountReportAsync(ReportFilter filter)
    {
        var query = _context.ChartOfAccounts
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.AccountType))
        {
            query = query.Where(x => x.AccountType == filter.AccountType);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            query = query.Where(x => x.AccountDescription == filter.Category);
        }

        return await query
            .OrderBy(x => x.AccountId)
            .Select(x => new ChartOfAccountReportDto
            {
                Id = x.Id,
                AccountId = x.AccountId,
                AccountDescription = x.AccountDescription,
                AccountType = x.AccountType
            })
            .ToListAsync();
    }

    public async Task<List<MonthlyFinancialSummaryDto>> GetMonthlyFinancialSummaryAsync(ReportFilter filter)
    {
        var incomes = await GetIncomeReportAsync(filter);
        var expenses = await GetExpenseReportAsync(filter);
        var fees = await GetFeeReportAsync(filter);
        var salaries = await GetSalaryReportAsync(filter);

        var months = incomes.Select(x => x.Date.ToString("yyyy-MM"))
            .Concat(expenses.Select(x => x.Date.ToString("yyyy-MM")))
            .Concat(fees.Select(x => x.Date.ToString("yyyy-MM")))
            .Concat(salaries.Select(x => x.SalaryMonth))
            .Distinct()
            .OrderByDescending(x => x)
            .ToList();

        return months.Select(month =>
        {
            var income = incomes.Where(x => x.Date.ToString("yyyy-MM") == month).Sum(x => x.Amount);
            var fee = fees.Where(x => x.Date.ToString("yyyy-MM") == month).Sum(x => x.Amount);
            var expense = expenses.Where(x => x.Date.ToString("yyyy-MM") == month).Sum(x => x.Amount);
            var salary = salaries.Where(x => x.SalaryMonth == month).Sum(x => x.NetSalary);

            return new MonthlyFinancialSummaryDto
            {
                Month = month,
                TotalIncome = income,
                TotalFees = fee,
                TotalExpenses = expense,
                TotalSalary = salary,
                NetBalance = income + fee - expense - salary
            };
        }).ToList();
    }
}