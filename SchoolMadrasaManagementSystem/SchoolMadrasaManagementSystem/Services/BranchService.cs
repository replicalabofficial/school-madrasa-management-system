using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public class BranchService : IBranchService
{
    private const int MaxBranches = 3;

    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;

    public BranchService(
        AppDbContext context,
        IBranchContextService branchContextService)
    {
        _context = context;
        _branchContextService = branchContextService;
    }

    public async Task<List<Branch>> GetAllAsync()
    {
        var isHeadOffice =
            await _branchContextService.IsHeadOfficeAdminAsync();

        var branchId =
            await _branchContextService.GetCurrentBranchIdAsync();

        var query = _context.Branches
            .AsNoTracking()
            .AsQueryable();

        if (!isHeadOffice)
        {
            if (!branchId.HasValue)
            {
                return new List<Branch>();
            }

            query = query.Where(x => x.Id == branchId.Value);
        }

        return await query
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<Branch?> GetByIdAsync(int id)
    {
        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (branch is null)
        {
            return null;
        }

        var isHeadOffice =
            await _branchContextService.IsHeadOfficeAdminAsync();

        if (isHeadOffice)
        {
            return branch;
        }

        var branchId =
            await _branchContextService.GetCurrentBranchIdAsync();

        return branchId == branch.Id ? branch : null;
    }

    public async Task<Branch> CreateAsync(Branch branch)
    {
        Validate(branch);

        var currentCount = await _context.Branches.CountAsync();

        if (currentCount >= MaxBranches)
        {
            throw new InvalidOperationException(
                $"Maximum of {MaxBranches} branches allowed. Contact your system provider to add more.");
        }

        var code = branch.Code.Trim();

        var exists = await _context.Branches
            .AnyAsync(x => x.Code == code);

        if (exists)
        {
            throw new InvalidOperationException(
                "A branch with this code already exists.");
        }

        branch.Name = branch.Name.Trim();
        branch.Code = code;
        branch.Address = string.IsNullOrWhiteSpace(branch.Address)
            ? null
            : branch.Address.Trim();

        _context.Branches.Add(branch);

        await _context.SaveChangesAsync();

        return branch;
    }

    public async Task<bool> UpdateAsync(Branch branch)
    {
        Validate(branch);

        var existing = await _context.Branches
            .FirstOrDefaultAsync(x => x.Id == branch.Id);

        if (existing is null)
        {
            return false;
        }

        var code = branch.Code.Trim();

        var duplicate = await _context.Branches
            .AnyAsync(x =>
                x.Id != branch.Id &&
                x.Code == code);

        if (duplicate)
        {
            throw new InvalidOperationException(
                "A branch with this code already exists.");
        }

        existing.Name = branch.Name.Trim();
        existing.Code = code;
        existing.Address =
            string.IsNullOrWhiteSpace(branch.Address)
                ? null
                : branch.Address.Trim();

        existing.IsActive = branch.IsActive;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> SetActiveStatusAsync(
        int id,
        bool isActive)
    {
        var branch = await _context.Branches
            .FirstOrDefaultAsync(x => x.Id == id);

        if (branch is null)
        {
            return false;
        }

        branch.IsActive = isActive;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var branch = await _context.Branches.FirstOrDefaultAsync(x => x.Id == id);
        if (branch is null) return false;

        _context.Branches.Remove(branch);
        await _context.SaveChangesAsync();
        return true;
    }

    private static void Validate(Branch branch)
    {
        if (string.IsNullOrWhiteSpace(branch.Name))
        {
            throw new ArgumentException(
                "Branch name is required.");
        }

        if (string.IsNullOrWhiteSpace(branch.Code))
        {
            throw new ArgumentException(
                "Branch code is required.");
        }
    }
}