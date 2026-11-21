using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Ledger;
using static SchoolMadrasaManagementSystem.Entities.BalanceSheetDto;

namespace SchoolMadrasaManagementSystem.Services;

public class LedgerService : ILedgerService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    private static readonly string[] DebitNormalTypes =
    {
        "Cash", "Fixed Assets", "Accounts Receivable", "Inventory", "Cost of Sales", "Expenses"
    };

    public LedgerService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<List<JournalLineDto>> GetJournalLinesAsync(DateTime? dateFrom, DateTime? dateTo)
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var arAccount = await _context.ChartOfAccounts.FirstOrDefaultAsync(x => x.AccountId == "1100");

        var lines = new List<JournalLineDto>();

        var incomeQuery = _context.Incomes.Include(x => x.Branch).AsQueryable();
        if (!isHeadOffice && userBranchId.HasValue) incomeQuery = incomeQuery.Where(x => x.BranchId == userBranchId.Value);

        foreach (var income in await incomeQuery.ToListAsync())
        {
            var branchName = income.Branch?.Name ?? string.Empty;

            lines.Add(new JournalLineDto { AccountId = income.ChartOfAccountId, Date = income.Date, Description = income.Description, BranchName = branchName, Debit = 0, Credit = income.Amount, SourceType = "Income", SourceId = income.Id, IsReconciled = false });

            if (income.SourceAccountId.HasValue)
                lines.Add(new JournalLineDto { AccountId = income.SourceAccountId.Value, Date = income.Date, Description = income.Description, BranchName = branchName, Debit = income.Amount, Credit = 0, SourceType = "Income", SourceId = income.Id, IsReconciled = income.IsReconciled });
        }

        var expenseQuery = _context.Expenses.Include(x => x.Branch).AsQueryable();
        if (!isHeadOffice && userBranchId.HasValue) expenseQuery = expenseQuery.Where(x => x.BranchId == userBranchId.Value);

        foreach (var expense in await expenseQuery.ToListAsync())
        {
            var branchName = expense.Branch?.Name ?? string.Empty;

            lines.Add(new JournalLineDto { AccountId = expense.ChartOfAccountId, Date = expense.Date, Description = expense.Description, BranchName = branchName, Debit = expense.Amount, Credit = 0, SourceType = "Expense", SourceId = expense.Id, IsReconciled = false });

            if (expense.SourceAccountId.HasValue)
                lines.Add(new JournalLineDto { AccountId = expense.SourceAccountId.Value, Date = expense.Date, Description = expense.Description, BranchName = branchName, Debit = 0, Credit = expense.Amount, SourceType = "Expense", SourceId = expense.Id, IsReconciled = expense.IsReconciled });
        }

        var feeQuery = _context.Fees.Include(x => x.Branch).AsQueryable();
        if (!isHeadOffice && userBranchId.HasValue) feeQuery = feeQuery.Where(x => x.BranchId == userBranchId.Value);

        foreach (var fee in await feeQuery.ToListAsync())
        {
            var branchName = fee.Branch?.Name ?? string.Empty;

            // Only an approved discount reduces the fee; the student owes and pays the net amount
            var approvedDiscount = fee.DiscountAmount > 0 && fee.DiscountApprovalStatus == "Approved" ? fee.DiscountAmount : 0m;
            var netAmount = Math.Max(0m, fee.Amount - approvedDiscount);
            var feeText = approvedDiscount > 0 ? $"Fee: {fee.Category} (after discount {approvedDiscount:N0})" : $"Fee: {fee.Category}";

            if (netAmount > 0 && fee.ChartOfAccountId.HasValue && arAccount != null)
            {
                lines.Add(new JournalLineDto { AccountId = arAccount.Id, Date = fee.Date, Description = feeText, BranchName = branchName, Debit = netAmount, Credit = 0, SourceType = "Fee", SourceId = fee.Id, IsReconciled = false });
                lines.Add(new JournalLineDto { AccountId = fee.ChartOfAccountId.Value, Date = fee.Date, Description = feeText, BranchName = branchName, Debit = 0, Credit = netAmount, SourceType = "Fee", SourceId = fee.Id, IsReconciled = false });
            }

            if (netAmount > 0 && fee.Status == "Paid" && fee.SourceAccountId.HasValue && arAccount != null)
            {
                var paidDate = fee.PaidDate ?? fee.Date;
                lines.Add(new JournalLineDto { AccountId = fee.SourceAccountId.Value, Date = paidDate, Description = $"Fee Payment: {fee.Category}", BranchName = branchName, Debit = netAmount, Credit = 0, SourceType = "FeePayment", SourceId = fee.Id, IsReconciled = fee.IsReconciled });
                lines.Add(new JournalLineDto { AccountId = arAccount.Id, Date = paidDate, Description = $"Fee Payment: {fee.Category}", BranchName = branchName, Debit = 0, Credit = netAmount, SourceType = "FeePayment", SourceId = fee.Id, IsReconciled = false });
            }
        }

        var paymentQuery = _context.SalaryPayments.AsQueryable();
        if (!isHeadOffice && userBranchId.HasValue) paymentQuery = paymentQuery.Where(x => x.BranchId == userBranchId.Value);

        var branchNames = await _context.Branches.ToDictionaryAsync(b => b.Id, b => b.Name);

        foreach (var payment in await paymentQuery.ToListAsync())
        {
            var branchName = branchNames.TryGetValue(payment.BranchId, out var name) ? name : string.Empty;

            lines.Add(new JournalLineDto { AccountId = payment.ChartOfAccountId, Date = payment.PaymentDate, Description = "Salary Payment", BranchName = branchName, Debit = payment.Amount, Credit = 0, SourceType = "SalaryPayment", SourceId = payment.Id, IsReconciled = false });
            lines.Add(new JournalLineDto { AccountId = payment.SourceAccountId, Date = payment.PaymentDate, Description = "Salary Payment", BranchName = branchName, Debit = 0, Credit = payment.Amount, SourceType = "SalaryPayment", SourceId = payment.Id, IsReconciled = payment.IsReconciled });
        }

        var adjustmentQuery = _context.SalaryAdjustments.AsQueryable();
        if (!isHeadOffice && userBranchId.HasValue) adjustmentQuery = adjustmentQuery.Where(x => x.BranchId == userBranchId.Value);

        foreach (var adj in await adjustmentQuery.ToListAsync())
        {
            var branchName = branchNames.TryGetValue(adj.BranchId, out var bn) ? bn : string.Empty;

            lines.Add(new JournalLineDto { AccountId = adj.ChartOfAccountId, Date = adj.Date, Description = $"Additional Salary: {adj.Reason}", BranchName = branchName, Debit = adj.Amount, Credit = 0, SourceType = "SalaryAdjustment", SourceId = adj.Id, IsReconciled = false });
            lines.Add(new JournalLineDto { AccountId = adj.SourceAccountId, Date = adj.Date, Description = $"Additional Salary: {adj.Reason}", BranchName = branchName, Debit = 0, Credit = adj.Amount, SourceType = "SalaryAdjustment", SourceId = adj.Id, IsReconciled = false });
        }

        // Opening balances: account on one side, "Opening Balance Equity" on the other
        var openingEquity = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(x => x.AccountId == OpeningBalanceService.EquityAccountCode);

        if (openingEquity != null)
        {
            var openingQuery = _context.OpeningBalances.AsQueryable();
            if (!isHeadOffice && userBranchId.HasValue) openingQuery = openingQuery.Where(x => x.BranchId == userBranchId.Value);

            foreach (var ob in await openingQuery.ToListAsync())
            {
                var branchName = branchNames.TryGetValue(ob.BranchId, out var obn) ? obn : string.Empty;
                var isDebit = ob.EntryType == "Debit";
                var description = string.IsNullOrWhiteSpace(ob.Description) ? "Opening Balance" : $"Opening Balance: {ob.Description}";

                lines.Add(new JournalLineDto { AccountId = ob.ChartOfAccountId, Date = ob.Date, Description = description, BranchName = branchName, Debit = isDebit ? ob.Amount : 0, Credit = isDebit ? 0 : ob.Amount, SourceType = "OpeningBalance", SourceId = ob.Id, IsReconciled = false });
                lines.Add(new JournalLineDto { AccountId = openingEquity.Id, Date = ob.Date, Description = description, BranchName = branchName, Debit = isDebit ? 0 : ob.Amount, Credit = isDebit ? ob.Amount : 0, SourceType = "OpeningBalance", SourceId = ob.Id, IsReconciled = false });
            }
        }

        // Journal vouchers and year-end closing entries
        var journalLineQuery = _context.JournalEntryLines.Include(x => x.JournalEntry).AsQueryable();
        if (!isHeadOffice && userBranchId.HasValue) journalLineQuery = journalLineQuery.Where(x => x.BranchId == userBranchId.Value);

        foreach (var jl in await journalLineQuery.ToListAsync())
        {
            var branchName = jl.BranchId.HasValue && branchNames.TryGetValue(jl.BranchId.Value, out var jbn) ? jbn : string.Empty;
            var isYearEnd = jl.JournalEntry.EntryType == JournalEntryService.YearEndType;
            var description = string.IsNullOrWhiteSpace(jl.Note)
                ? $"{jl.JournalEntry.EntryNumber}: {jl.JournalEntry.Description}"
                : $"{jl.JournalEntry.EntryNumber}: {jl.JournalEntry.Description} ({jl.Note})";

            lines.Add(new JournalLineDto { AccountId = jl.ChartOfAccountId, Date = jl.JournalEntry.Date, Description = description, BranchName = branchName, Debit = jl.Debit, Credit = jl.Credit, SourceType = isYearEnd ? "YearEndClosing" : "JournalVoucher", SourceId = jl.JournalEntryId, IsReconciled = false });
        }

        var filtered = lines.AsEnumerable();
        if (dateFrom.HasValue) filtered = filtered.Where(l => l.Date >= dateFrom.Value);
        if (dateTo.HasValue) filtered = filtered.Where(l => l.Date < dateTo.Value.Date.AddDays(1));

        return filtered.OrderBy(l => l.Date).ToList();
    }

    private decimal SignedAmount(JournalLineDto line, bool isDebitNormal) =>
        isDebitNormal ? line.Debit - line.Credit : line.Credit - line.Debit;

    public async Task<List<LedgerEntryDto>> GetLedgerAsync(int chartOfAccountId, DateTime? dateFrom, DateTime? dateTo)
    {
        var report = await GetLedgerReportAsync(chartOfAccountId, dateFrom, dateTo);
        return report?.Entries ?? new List<LedgerEntryDto>();
    }

    public async Task<List<LedgerEntryDto>> GetGeneralLedgerAsync(DateTime? dateFrom, DateTime? dateTo)
    {
        var report = await GetLedgerReportAsync(null, dateFrom, dateTo);
        return report?.Entries ?? new List<LedgerEntryDto>();
    }

    // chartOfAccountId = null -> Cash account (101)
    public async Task<LedgerReportDto?> GetLedgerReportAsync(int? chartOfAccountId, DateTime? dateFrom, DateTime? dateTo)
    {
        var account = chartOfAccountId.HasValue
            ? await _context.ChartOfAccounts.FirstOrDefaultAsync(x => x.Id == chartOfAccountId.Value)
            : await _context.ChartOfAccounts.FirstOrDefaultAsync(x => x.AccountId == "101");

        if (account is null) return null;

        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        if (!isHeadOffice && account.BranchId.HasValue)
        {
            var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();
            if (account.BranchId != userBranchId)
            {
                throw new UnauthorizedAccessException("You cannot view another branch's account.");
            }
        }

        var isDebitNormal = DebitNormalTypes.Contains(account.AccountType);
        var from = dateFrom?.Date;

        // Everything up to DateTo; split into "before period" and "in period"
        var allLines = await GetJournalLinesAsync(null, dateTo);
        var accountLines = allLines.Where(l => l.AccountId == account.Id).OrderBy(l => l.Date).ToList();

        var beforePeriod = from.HasValue ? accountLines.Where(l => l.Date < from.Value) : Enumerable.Empty<JournalLineDto>();
        var inPeriod = from.HasValue ? accountLines.Where(l => l.Date >= from.Value).ToList() : accountLines;

        var openingBalance = beforePeriod.Sum(l => SignedAmount(l, isDebitNormal));
        var runningBalance = openingBalance;
        var entries = new List<LedgerEntryDto>();

        foreach (var line in inPeriod)
        {
            runningBalance += SignedAmount(line, isDebitNormal);

            entries.Add(new LedgerEntryDto
            {
                Date = line.Date,
                Description = line.Description,
                BranchName = line.BranchName,
                Debit = line.Debit,
                Credit = line.Credit,
                RunningBalance = runningBalance,
                SourceType = line.SourceType,
                SourceId = line.SourceId,
                IsReconciled = line.IsReconciled,
            });
        }

        return new LedgerReportDto
        {
            ChartOfAccountId = account.Id,
            AccountId = account.AccountId,
            AccountDescription = account.AccountDescription,
            AccountType = account.AccountType,
            DateFrom = dateFrom,
            DateTo = dateTo,
            OpeningBalance = openingBalance,
            TotalDebit = inPeriod.Sum(l => l.Debit),
            TotalCredit = inPeriod.Sum(l => l.Credit),
            ClosingBalance = runningBalance,
            Entries = entries,
        };
    }

    public async Task<List<LedgerAccountOptionDto>> GetLedgerAccountsAsync()
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var query = _context.ChartOfAccounts.AsNoTracking().AsQueryable();

        if (!isHeadOffice)
        {
            query = query.Where(x => x.BranchId == null || x.BranchId == userBranchId);
        }

        return await query
            .OrderBy(x => x.AccountId)
            .Select(x => new LedgerAccountOptionDto
            {
                Id = x.Id,
                AccountId = x.AccountId,
                AccountDescription = x.AccountDescription,
                AccountType = x.AccountType,
            })
            .ToListAsync();
    }
}