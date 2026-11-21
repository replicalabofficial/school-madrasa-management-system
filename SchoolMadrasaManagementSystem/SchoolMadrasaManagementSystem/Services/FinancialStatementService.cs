using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using static SchoolMadrasaManagementSystem.Entities.BalanceSheetDto;

namespace SchoolMadrasaManagementSystem.Services;

public interface IFinancialStatementService
{
    Task<List<TrialBalanceRowDto>> GetTrialBalanceAsync(DateTime? dateFrom, DateTime? dateTo);
    Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime? asOfDate);

    Task<IncomeStatementDto> GetIncomeStatementAsync(DateTime? dateFrom, DateTime? dateTo);
}

public class FinancialStatementService : IFinancialStatementService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;
    private readonly ILedgerService _ledgerService;

    private static readonly string[] DebitNormalTypes =
    {
        "Cash", "Fixed Assets", "Accounts Receivable", "Inventory", "Cost of Sales", "Expenses"
    };

    public FinancialStatementService(
        AppDbContext context,
        IBranchContextService branchContextService,
        ILedgerService ledgerService)
    {
        _context = context;
        _branchContextService = branchContextService;
        _ledgerService = ledgerService;
    }

    public async Task<IncomeStatementDto> GetIncomeStatementAsync(DateTime? dateFrom, DateTime? dateTo)
    {
        // Year-end closing entries move income/expense to Retained Earnings;
        // they are excluded here so the Income Statement still shows the year's real figures.
        var totals = await BuildAccountTotalsAsync(dateFrom, dateTo, excludeYearEndClosing: true);
        var accounts = await _context.ChartOfAccounts.ToListAsync();

        decimal NetBalance(ChartOfAccount account)
        {
            if (!totals.TryGetValue(account.Id, out var t)) return 0;
            var net = t.Debit - t.Credit;
            var isDebitNormal = DebitNormalTypes.Contains(account.AccountType);
            return isDebitNormal ? net : -net;
        }

        var incomeTypes = new[] { "Income" };
        var expenseTypes = new[] { "Expenses", "Cost of Sales" };

        var incomeLines = accounts
            .Where(a => incomeTypes.Contains(a.AccountType) && NetBalance(a) != 0)
            .Select(a => new BalanceSheetLineDto { AccountDescription = a.AccountDescription, Balance = NetBalance(a) })
            .OrderByDescending(a => a.Balance)
            .ToList();

        var expenseLines = accounts
            .Where(a => expenseTypes.Contains(a.AccountType) && NetBalance(a) != 0)
            .Select(a => new BalanceSheetLineDto { AccountDescription = a.AccountDescription, Balance = NetBalance(a) })
            .OrderByDescending(a => a.Balance)
            .ToList();

        var totalIncome = incomeLines.Sum(l => l.Balance);
        var totalExpenses = expenseLines.Sum(l => l.Balance);

        return new IncomeStatementDto
        {
            IncomeLines = incomeLines,
            ExpenseLines = expenseLines,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            NetIncome = totalIncome - totalExpenses,
        };
    }
    private async Task<Dictionary<int, (decimal Debit, decimal Credit)>> BuildAccountTotalsAsync(DateTime? dateFrom, DateTime? dateTo, bool excludeYearEndClosing = false)
    {
        var lines = await _ledgerService.GetJournalLinesAsync(dateFrom, dateTo);
        var totals = new Dictionary<int, (decimal Debit, decimal Credit)>();

        foreach (var line in lines)
        {
            if (excludeYearEndClosing && line.SourceType == "YearEndClosing") continue;

            var current = totals.TryGetValue(line.AccountId, out var v) ? v : (0m, 0m);
            totals[line.AccountId] = (current.Item1 + line.Debit, current.Item2 + line.Credit);
        }

        return totals;
    }

    public async Task<List<TrialBalanceRowDto>> GetTrialBalanceAsync(DateTime? dateFrom, DateTime? dateTo)
    {
        var totals = await BuildAccountTotalsAsync(dateFrom, dateTo);
        var accounts = await _context.ChartOfAccounts.ToListAsync();

        var rows = new List<TrialBalanceRowDto>();

        foreach (var account in accounts)
        {
            if (!totals.TryGetValue(account.Id, out var t)) continue;

            var net = t.Debit - t.Credit;
            var isDebitNormal = DebitNormalTypes.Contains(account.AccountType);

            decimal debit = 0, credit = 0;

            if (isDebitNormal)
            {
                if (net >= 0) debit = net; else credit = -net;
            }
            else
            {
                if (net <= 0) credit = -net; else debit = net;
            }

            if (debit == 0 && credit == 0) continue;

            rows.Add(new TrialBalanceRowDto
            {
                ChartOfAccountId = account.Id,
                AccountId = account.AccountId,
                AccountDescription = account.AccountDescription,
                AccountType = account.AccountType,
                Debit = debit,
                Credit = credit,
            });
        }

        return rows.OrderBy(r => r.AccountId).ToList();
    }

    public async Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime? asOfDate)
    {
        var totals = await BuildAccountTotalsAsync(null, asOfDate);
        var accounts = await _context.ChartOfAccounts.ToListAsync();

        decimal NetBalance(ChartOfAccount account)
        {
            if (!totals.TryGetValue(account.Id, out var t)) return 0;
            var net = t.Debit - t.Credit;
            var isDebitNormal = DebitNormalTypes.Contains(account.AccountType);
            return isDebitNormal ? net : -net;
        }

        var assetTypes = new[] { "Cash", "Fixed Assets", "Accounts Receivable", "Inventory" };
        var liabilityTypes = new[] { "Accounts Payable" };
        var equityTypes = new[] { "Equity–Doesn't Close", "Equity–Retained Earnings" };
        var incomeTypes = new[] { "Income" };
        var expenseTypes = new[] { "Expenses", "Cost of Sales" };

        var assets = accounts
            .Where(a => assetTypes.Contains(a.AccountType) && NetBalance(a) != 0)
            .Select(a => new BalanceSheetLineDto { AccountDescription = a.AccountDescription, Balance = NetBalance(a) })
            .OrderBy(a => a.AccountDescription)
            .ToList();

        var liabilities = accounts
            .Where(a => liabilityTypes.Contains(a.AccountType) && NetBalance(a) != 0)
            .Select(a => new BalanceSheetLineDto { AccountDescription = a.AccountDescription, Balance = NetBalance(a) })
            .OrderBy(a => a.AccountDescription)
            .ToList();

        var equity = accounts
            .Where(a => equityTypes.Contains(a.AccountType) && NetBalance(a) != 0)
            .Select(a => new BalanceSheetLineDto { AccountDescription = a.AccountDescription, Balance = NetBalance(a) })
            .OrderBy(a => a.AccountDescription)
            .ToList();

        var totalIncome = accounts.Where(a => incomeTypes.Contains(a.AccountType)).Sum(NetBalance);
        var totalExpense = accounts.Where(a => expenseTypes.Contains(a.AccountType)).Sum(NetBalance);
        var netIncome = totalIncome - totalExpense;

        if (netIncome != 0)
        {
            equity.Add(new BalanceSheetLineDto { AccountDescription = "Net Income (Current Period)", Balance = netIncome });
        }

        var totalAssets = assets.Sum(a => a.Balance);
        var totalLiabilities = liabilities.Sum(a => a.Balance);
        var totalEquity = equity.Sum(a => a.Balance);

        return new BalanceSheetDto
        {
            Assets = assets,
            Liabilities = liabilities,
            Equity = equity,
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            TotalEquity = totalEquity,
            TotalLiabilitiesAndEquity = totalLiabilities + totalEquity,
        };
    }
}