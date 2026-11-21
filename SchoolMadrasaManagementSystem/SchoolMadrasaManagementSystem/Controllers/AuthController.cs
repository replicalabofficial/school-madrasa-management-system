using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.DTOs.Auth;
using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IBranchModuleAccessService _moduleAccessService;
    private readonly AppDbContext _context;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IBranchModuleAccessService moduleAccessService,
        AppDbContext context)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _moduleAccessService = moduleAccessService;
        _context = context;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginPolicy")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            return BadRequest(new { message = "Username is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Password is required." });
        }

        var user = await _userManager.FindByNameAsync(request.UserName.Trim());

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { message = "User account is inactive." });
        }

        var passwordResult = await _signInManager.CheckPasswordSignInAsync(
            user, request.Password, lockoutOnFailure: false);

        if (!passwordResult.Succeeded)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized(new { message = "User role is not configured." });
        }

        // Branch accounts ko apna branch code bhi dena zaroori hai
        if (role != Roles.HeadOfficeAdmin)
        {
            if (!user.BranchId.HasValue)
            {
                return Unauthorized(new { message = "This account is not assigned to a branch." });
            }

            var branch = await _context.Branches.FirstOrDefaultAsync(x => x.Id == user.BranchId.Value);

            if (branch is null)
            {
                return Unauthorized(new { message = "Assigned branch not found." });
            }

            if (string.IsNullOrWhiteSpace(request.BranchCode) ||
                !string.Equals(branch.Code.Trim(), request.BranchCode.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new { message = "Invalid branch code." });
            }
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim("FullName", user.FullName),
            new Claim(ClaimTypes.Role, role)
        };

        if (user.BranchId.HasValue)
        {
            claims.Add(new Claim("BranchId", user.BranchId.Value.ToString()));
        }

        var identity = new ClaimsIdentity(claims, IdentityConstants.ApplicationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(IdentityConstants.ApplicationScheme, principal);

        var enabledModules = await GetEnabledModulesAsync(role, user.BranchId);

        return Ok(new LoginResponseDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            FullName = user.FullName,
            Role = role,
            BranchId = user.BranchId,
            EnabledModules = enabledModules
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<LoginResponseDto>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(userId);

        if (user is null)
        {
            return Unauthorized();
        }

        if (!user.IsActive)
        {
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            return Unauthorized();
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized();
        }

        var enabledModules = await GetEnabledModulesAsync(role, user.BranchId);

        return Ok(new LoginResponseDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            FullName = user.FullName,
            Role = role,
            BranchId = user.BranchId,
            EnabledModules = enabledModules
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
        return NoContent();
    }

    private async Task<List<string>> GetEnabledModulesAsync(string role, int? branchId)
    {
        if (role == Roles.HeadOfficeAdmin)
        {
            return BranchModules.All.ToList();
        }

        if (!branchId.HasValue)
        {
            return new List<string>();
        }

        return await _moduleAccessService.GetEnabledModulesAsync(branchId.Value);
    }
}