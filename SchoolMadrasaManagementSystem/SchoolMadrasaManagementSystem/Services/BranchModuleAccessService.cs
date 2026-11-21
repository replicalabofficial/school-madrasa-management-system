using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services;

public interface IBranchModuleAccessService
{
    Task<List<string>> GetEnabledModulesAsync(int branchId);
    Task<Dictionary<string, bool>> GetModuleStatesAsync(int branchId);
    Task SetModuleStateAsync(int branchId, string moduleKey, bool isEnabled);
}

public class BranchModuleAccessService : IBranchModuleAccessService
{
    private readonly AppDbContext _context;

    public BranchModuleAccessService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<string>> GetEnabledModulesAsync(int branchId)
    {
        var overrides = await _context.BranchModulePermissions
            .AsNoTracking()
            .Where(x => x.BranchId == branchId)
            .ToListAsync();

        var enabled = new List<string>();

        foreach (var moduleKey in BranchModules.All)
        {
            var entry = overrides.FirstOrDefault(x => x.ModuleKey == moduleKey);
            var isEnabled = entry?.IsEnabled ?? true;

            if (isEnabled)
            {
                enabled.Add(moduleKey);
            }
        }

        return enabled;
    }

    public async Task<Dictionary<string, bool>> GetModuleStatesAsync(int branchId)
    {
        var overrides = await _context.BranchModulePermissions
            .AsNoTracking()
            .Where(x => x.BranchId == branchId)
            .ToListAsync();

        var states = new Dictionary<string, bool>();

        foreach (var moduleKey in BranchModules.All)
        {
            var entry = overrides.FirstOrDefault(x => x.ModuleKey == moduleKey);
            states[moduleKey] = entry?.IsEnabled ?? true;
        }

        return states;
    }

    public async Task SetModuleStateAsync(int branchId, string moduleKey, bool isEnabled)
    {
        if (!BranchModules.All.Contains(moduleKey))
        {
            throw new ArgumentException("Unknown module.");
        }

        var entry = await _context.BranchModulePermissions
            .FirstOrDefaultAsync(x => x.BranchId == branchId && x.ModuleKey == moduleKey);

        if (entry is null)
        {
            entry = new BranchModulePermission
            {
                BranchId = branchId,
                ModuleKey = moduleKey,
                IsEnabled = isEnabled,
            };
            _context.BranchModulePermissions.Add(entry);
        }
        else
        {
            entry.IsEnabled = isEnabled;
        }

        await _context.SaveChangesAsync();
    }
}