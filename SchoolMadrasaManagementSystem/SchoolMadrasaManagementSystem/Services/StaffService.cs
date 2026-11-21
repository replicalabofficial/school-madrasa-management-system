using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Security;

namespace SchoolMadrasaManagementSystem.Services;

public class StaffService : IStaffService
{
    private readonly AppDbContext _context;
    private readonly IBranchSecurityContext _security;

    public StaffService(AppDbContext context, IBranchSecurityContext security)
    {
        _context = context;
        _security = security;
    }

    public async Task<List<Staff>> GetAllAsync()
    {
        return await _context.Staff
            .AsNoTracking()
            .Include(x => x.Branch)
            .ApplyBranchFilter(_security)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<Staff?> GetByIdAsync(int id)
    {
        var staff = await _context.Staff.Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (staff is null) return null;

        _security.EnsureBranchAccess(staff.BranchId);
        return staff;
    }

    public async Task<Staff> CreateAsync(Staff staff)
    {
        Validate(staff);

        if (!_security.IsHeadOffice)
        {
            staff.BranchId = _security.GetRequiredBranchId();
        }

        var branchExists = await _context.Branches.AnyAsync(x => x.Id == staff.BranchId && x.IsActive);
        if (!branchExists)
        {
            throw new InvalidOperationException("Selected branch does not exist or is inactive.");
        }

        _context.Staff.Add(staff);
        await _context.SaveChangesAsync();

        return await _context.Staff.Include(x => x.Branch).FirstAsync(x => x.Id == staff.Id);
    }

    public async Task<bool> UpdateAsync(Staff staff)
    {
        Validate(staff);

        var existing = await _context.Staff.FirstOrDefaultAsync(x => x.Id == staff.Id);
        if (existing is null) return false;

        _security.EnsureBranchAccess(existing.BranchId);

        if (!_security.IsHeadOffice)
        {
            staff.BranchId = existing.BranchId;
        }

        var branchExists = await _context.Branches.AnyAsync(x => x.Id == staff.BranchId && x.IsActive);
        if (!branchExists)
        {
            throw new InvalidOperationException("Selected branch does not exist or is inactive.");
        }

        existing.Name = staff.Name.Trim();
        existing.BranchId = staff.BranchId;
        existing.Designation = staff.Designation;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var staff = await _context.Staff.FirstOrDefaultAsync(x => x.Id == id);
        if (staff is null) return false;

        _security.EnsureBranchAccess(staff.BranchId);

        _context.Staff.Remove(staff);
        await _context.SaveChangesAsync();
        return true;
    }

    private static void Validate(Staff staff)
    {
        if (string.IsNullOrWhiteSpace(staff.Name))
            throw new ArgumentException("Staff name is required.");

        if (staff.BranchId <= 0)
            throw new ArgumentException("Branch is required.");

        if (!StaffDesignations.All.Contains(staff.Designation))
            throw new ArgumentException("Invalid designation.");
    }
}