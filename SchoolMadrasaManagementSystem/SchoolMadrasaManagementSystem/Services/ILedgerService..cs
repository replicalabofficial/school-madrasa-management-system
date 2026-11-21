using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Ledger;
using static SchoolMadrasaManagementSystem.Entities.BalanceSheetDto;

namespace SchoolMadrasaManagementSystem.Services;

public interface ILedgerService
{
    Task<List<JournalLineDto>> GetJournalLinesAsync(DateTime? dateFrom, DateTime? dateTo);
    Task<List<LedgerEntryDto>> GetLedgerAsync(int chartOfAccountId, DateTime? dateFrom, DateTime? dateTo);
    Task<List<LedgerEntryDto>> GetGeneralLedgerAsync(DateTime? dateFrom, DateTime? dateTo);

    // Ledger with opening balance, running balance and closing balance
    Task<LedgerReportDto?> GetLedgerReportAsync(int? chartOfAccountId, DateTime? dateFrom, DateTime? dateTo);

    // Accounts the current user may open a ledger for
    Task<List<LedgerAccountOptionDto>> GetLedgerAccountsAsync();
}