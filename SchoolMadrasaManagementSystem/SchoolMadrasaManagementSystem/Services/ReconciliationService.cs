using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;

namespace SchoolMadrasaManagementSystem.Services;

public interface IReconciliationService
{
    Task<bool> ToggleReconciledAsync(string sourceType, int sourceId, bool isReconciled);
}

public class ReconciliationService : IReconciliationService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    public ReconciliationService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<bool> ToggleReconciledAsync(string sourceType, int sourceId, bool isReconciled)
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        switch (sourceType)
        {
            case "Income":
                var income = await _context.Incomes.FirstOrDefaultAsync(x => x.Id == sourceId);
                if (income is null) return false;
                if (!isHeadOffice && userBranchId != income.BranchId) throw new UnauthorizedAccessException();
                income.IsReconciled = isReconciled;
                income.ReconciledAt = isReconciled ? DateTime.UtcNow : null;
                break;

            case "Expense":
                var expense = await _context.Expenses.FirstOrDefaultAsync(x => x.Id == sourceId);
                if (expense is null) return false;
                if (!isHeadOffice && userBranchId != expense.BranchId) throw new UnauthorizedAccessException();
                expense.IsReconciled = isReconciled;
                expense.ReconciledAt = isReconciled ? DateTime.UtcNow : null;
                break;

            case "FeePayment":
                var fee = await _context.Fees.FirstOrDefaultAsync(x => x.Id == sourceId);
                if (fee is null) return false;
                if (!isHeadOffice && userBranchId != fee.BranchId) throw new UnauthorizedAccessException();
                fee.IsReconciled = isReconciled;
                fee.ReconciledAt = isReconciled ? DateTime.UtcNow : null;
                break;

            case "SalaryPayment":
                var payment = await _context.SalaryPayments.FirstOrDefaultAsync(x => x.Id == sourceId);
                if (payment is null) return false;
                if (!isHeadOffice && userBranchId != payment.BranchId) throw new UnauthorizedAccessException();
                payment.IsReconciled = isReconciled;
                payment.ReconciledAt = isReconciled ? DateTime.UtcNow : null;
                break;

            default:
                return false;
        }

        await _context.SaveChangesAsync();
        return true;
    }
}