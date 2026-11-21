using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Users;

namespace SchoolMadrasaManagementSystem.Services;

public class UserManagementService : IUserManagementService
{
    private const string HeadOfficeRole = "HeadOfficeAdmin";
    private const int MinPasswordLength = 8;

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly AppDbContext _context;
    private readonly IBranchContextService _branchContextService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    private static readonly string[] AllowedRoles =
    {
        "HeadOfficeAdmin",
        "BranchAdmin",
        "BranchUser"
    };

    public UserManagementService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        AppDbContext context,
        IBranchContextService branchContextService,
        IHttpContextAccessor httpContextAccessor)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _context = context;
        _branchContextService = branchContextService;
        _httpContextAccessor = httpContextAccessor;
    }

    private async Task EnsureHeadOfficeAdminAsync()
    {
        var isHeadOffice = await _branchContextService.IsHeadOfficeAdminAsync();
        if (!isHeadOffice)
        {
            throw new UnauthorizedAccessException("Access denied. User Management operations are restricted to Head Office Administrators.");
        }
    }

    // Id of the user making this request
    private string? CurrentUserId
    {
        get
        {
            var principal = _httpContextAccessor.HttpContext?.User;
            return principal is null ? null : _userManager.GetUserId(principal);
        }
    }

    // Active Head Office accounts, optionally ignoring one user
    private async Task<int> CountActiveHeadOfficeAsync(string? excludeUserId = null)
    {
        var headOfficeUsers = await _userManager.GetUsersInRoleAsync(HeadOfficeRole);
        return headOfficeUsers.Count(u => u.IsActive && u.Id != excludeUserId);
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        await EnsureHeadOfficeAdminAsync();

        var users = await _userManager.Users
            .Include(x => x.Branch)
            .OrderBy(x => x.UserName)
            .ToListAsync();

        var result = new List<UserDto>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);

            result.Add(new UserDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                IsActive = user.IsActive,
                BranchId = user.BranchId,
                BranchName = user.Branch?.Name ?? string.Empty,
                Role = roles.FirstOrDefault() ?? string.Empty
            });
        }

        return result;
    }

    public async Task<UserDto?> GetByIdAsync(string userId)
    {
        await EnsureHeadOfficeAdminAsync();

        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        var user = await _userManager.Users
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new UserDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            IsActive = user.IsActive,
            BranchId = user.BranchId,
            BranchName = user.Branch?.Name ?? string.Empty,
            Role = roles.FirstOrDefault() ?? string.Empty
        };
    }

    public async Task<UserDto> CreateAsync(CreateUserDto request)
    {
        await EnsureHeadOfficeAdminAsync();
        ValidateCreateRequest(request);

        ValidateRoleAndBranch(request.Role, request.BranchId);
        await ValidateRoleExistsAsync(request.Role.Trim());

        var branch = await GetBranchAsync(request.BranchId);

        var user = new ApplicationUser
        {
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            FullName = request.FullName.Trim(),
            BranchId = request.BranchId,
            IsActive = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                string.Join(" ", result.Errors.Select(x => x.Description)));
        }

        var roleResult = await _userManager.AddToRoleAsync(user, request.Role.Trim());

        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            throw new InvalidOperationException(
                string.Join(" ", roleResult.Errors.Select(x => x.Description)));
        }

        return new UserDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            IsActive = user.IsActive,
            BranchId = user.BranchId,
            BranchName = branch?.Name ?? string.Empty,
            Role = request.Role.Trim()
        };
    }

    public async Task<bool> UpdateAsync(UpdateUserDto request)
    {
        await EnsureHeadOfficeAdminAsync();
        ValidateUpdateRequest(request);

        var newRole = request.Role?.Trim() ?? string.Empty;
        ValidateRoleAndBranch(newRole, request.BranchId);
        await ValidateRoleExistsAsync(newRole);

        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == request.Id);

        if (user is null)
        {
            return false;
        }

        await GetBranchAsync(request.BranchId);

        var existingRoles = await _userManager.GetRolesAsync(user);
        var wasHeadOffice = existingRoles.Contains(HeadOfficeRole);
        var roleChanged = !(existingRoles.Count == 1 && existingRoles[0] == newRole);
        var isSelf = user.Id == CurrentUserId;

        // You cannot lock yourself out
        if (isSelf && !request.IsActive)
        {
            throw new InvalidOperationException("You cannot deactivate your own account.");
        }

        if (isSelf && newRole != HeadOfficeRole)
        {
            throw new InvalidOperationException("You cannot remove Head Office access from your own account.");
        }

        // Keep at least one active Head Office account
        var losesHeadOffice = wasHeadOffice && (newRole != HeadOfficeRole || !request.IsActive);
        if (losesHeadOffice && await CountActiveHeadOfficeAsync(excludeUserId: user.Id) == 0)
        {
            throw new InvalidOperationException("At least one active Head Office account is required.");
        }

        // Changes that must sign the user out of existing sessions
        var accessChanged = roleChanged
            || user.BranchId != request.BranchId
            || user.IsActive != request.IsActive;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        user.UserName = request.UserName.Trim();
        user.Email = request.Email.Trim();
        user.FullName = request.FullName.Trim();
        user.BranchId = request.BranchId;
        user.IsActive = request.IsActive;

        var updateResult = await _userManager.UpdateAsync(user);

        if (!updateResult.Succeeded)
        {
            throw new InvalidOperationException(
                string.Join(" ", updateResult.Errors.Select(x => x.Description)));
        }

        if (roleChanged)
        {
            if (existingRoles.Count > 0)
            {
                var removeResult = await _userManager.RemoveFromRolesAsync(user, existingRoles);
                if (!removeResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        string.Join(" ", removeResult.Errors.Select(x => x.Description)));
                }
            }

            var roleResult = await _userManager.AddToRoleAsync(user, newRole);

            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    string.Join(" ", roleResult.Errors.Select(x => x.Description)));
            }
        }

        if (accessChanged)
        {
            await _userManager.UpdateSecurityStampAsync(user);
        }

        await transaction.CommitAsync();
        return true;
    }

    public async Task<bool> SetActiveStatusAsync(string userId, bool isActive)
    {
        await EnsureHeadOfficeAdminAsync();

        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null)
        {
            return false;
        }

        if (!isActive)
        {
            if (user.Id == CurrentUserId)
            {
                throw new InvalidOperationException("You cannot deactivate your own account.");
            }

            if (await _userManager.IsInRoleAsync(user, HeadOfficeRole)
                && await CountActiveHeadOfficeAsync(excludeUserId: user.Id) == 0)
            {
                throw new InvalidOperationException("At least one active Head Office account is required.");
            }
        }

        user.IsActive = isActive;
        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                string.Join(" ", result.Errors.Select(x => x.Description)));
        }

        if (!isActive)
        {
            // Sign the user out of any open session
            await _userManager.UpdateSecurityStampAsync(user);
        }

        return true;
    }

    public async Task<bool> ResetPasswordAsync(string userId, string newPassword)
    {
        await EnsureHeadOfficeAdminAsync();

        if (string.IsNullOrWhiteSpace(newPassword))
        {
            throw new ArgumentException("New password is required.");
        }

        if (newPassword.Length < MinPasswordLength)
        {
            throw new ArgumentException($"Password must contain at least {MinPasswordLength} characters.");
        }

        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null)
        {
            return false;
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                string.Join(" ", result.Errors.Select(x => x.Description)));
        }

        // Clear any lockout and sign out existing sessions
        await _userManager.SetLockoutEndDateAsync(user, null);
        await _userManager.ResetAccessFailedCountAsync(user);
        await _userManager.UpdateSecurityStampAsync(user);

        return true;
    }

    public async Task<bool> DeleteAsync(string userId)
    {
        await EnsureHeadOfficeAdminAsync();

        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null)
        {
            return false;
        }

        if (user.Id == CurrentUserId)
        {
            throw new InvalidOperationException("You cannot delete your own account.");
        }

        if (await _userManager.IsInRoleAsync(user, HeadOfficeRole)
            && await CountActiveHeadOfficeAsync(excludeUserId: user.Id) == 0)
        {
            throw new InvalidOperationException("Cannot delete the last remaining Head Office account.");
        }

        var result = await _userManager.DeleteAsync(user);

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                string.Join(" ", result.Errors.Select(x => x.Description)));
        }

        return true;
    }

    private async Task<Branch?> GetBranchAsync(int? branchId)
    {
        if (!branchId.HasValue)
        {
            return null;
        }

        var branch = await _context.Branches.FirstOrDefaultAsync(x => x.Id == branchId.Value);

        if (branch is null)
        {
            throw new InvalidOperationException("Selected branch does not exist.");
        }

        if (!branch.IsActive)
        {
            throw new InvalidOperationException("Selected branch is inactive.");
        }

        return branch;
    }

    private async Task ValidateRoleExistsAsync(string role)
    {
        if (!AllowedRoles.Contains(role, StringComparer.Ordinal))
        {
            throw new ArgumentException("Invalid role.");
        }

        if (!await _roleManager.RoleExistsAsync(role))
        {
            throw new InvalidOperationException($"Role '{role}' does not exist.");
        }
    }

    private void ValidateRoleAndBranch(string role, int? branchId)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            throw new ArgumentException("Role is required.");
        }

        role = role.Trim();

        if (!AllowedRoles.Contains(role, StringComparer.Ordinal))
        {
            throw new ArgumentException("Invalid role.");
        }

        if (role == HeadOfficeRole)
        {
            if (branchId.HasValue)
            {
                throw new ArgumentException("Head Office Admin cannot be assigned to a branch.");
            }
        }
        else
        {
            if (!branchId.HasValue || branchId.Value <= 0)
            {
                throw new ArgumentException("A branch is required for branch users.");
            }
        }
    }

    private static void ValidateCreateRequest(CreateUserDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            throw new ArgumentException("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ArgumentException("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ArgumentException("Password is required.");
        }

        if (request.Password.Length < MinPasswordLength)
        {
            throw new ArgumentException($"Password must contain at least {MinPasswordLength} characters.");
        }
    }

    private static void ValidateUpdateRequest(UpdateUserDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
        {
            throw new ArgumentException("User ID is required.");
        }

        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            throw new ArgumentException("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ArgumentException("Full name is required.");
        }
    }
}