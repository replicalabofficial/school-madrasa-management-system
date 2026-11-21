using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using static SchoolMadrasaManagementSystem.Entities.BalanceSheetDto;

namespace SchoolMadrasaManagementSystem.Services;

public interface IAgingReportService
{
    Task<List<AgedReceivableRowDto>> GetAgedReceivablesAsync();
}

public class AgingReportService : IAgingReportService
{
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    public AgingReportService(AppDbContext context, IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<List<AgedReceivableRowDto>> GetAgedReceivablesAsync()
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        var userBranchId = await _branchContextService.GetCurrentBranchIdAsync();

        var query = _context.Fees
            .Include(x => x.Student)
            .Include(x => x.Branch)
            .Where(x => x.Status != "Paid")
            .AsQueryable();

        if (!isHeadOffice && userBranchId.HasValue)
            query = query.Where(x => x.BranchId == userBranchId.Value);

        var fees = await query.ToListAsync();
        var today = DateTime.UtcNow.Date;

        return fees.Select(f =>
        {
            var days = (today - f.Date.Date).Days;
            var bucket = days <= 30 ? "0-30 days" : days <= 60 ? "31-60 days" : days <= 90 ? "61-90 days" : "90+ days";

            return new AgedReceivableRowDto
            {
                FeeId = f.Id,
                SerialNumber = f.SerialNumber,
                StudentName = f.Student?.Name ?? string.Empty,
                BranchName = f.Branch?.Name ?? string.Empty,
                FeePeriod = f.FeePeriod,
                Amount = f.Amount,
                DaysOutstanding = days,
                AgingBucket = bucket,
            };
        })
        .OrderByDescending(r => r.DaysOutstanding)
        .ToList();
    }
}