using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.Security;
using SchoolMadrasaManagementSystem.Services;
using SchoolMadrasaManagementSystem.Users;
using System.Security.Claims;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = Roles.HeadOfficeAdmin)]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public UsersController(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll()
    {
        try
        {
            var users = await _userManagementService.GetAllAsync();
            return Ok(users);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("User ID is required.");
        }

        try
        {
            var user = await _userManagementService.GetByIdAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            return Ok(user);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserDto request)
    {
        try
        {
            var existingUsers = await _userManagementService.GetAllAsync();

            if (request.Role == Roles.HeadOfficeAdmin)
            {
                var headOfficeCount = existingUsers.Count(u => u.Role == Roles.HeadOfficeAdmin);

                if (headOfficeCount >= 3)
                {
                    return BadRequest(new { message = "Only 2 additional Head Office users can be added." });
                }
            }
            else
            {
                var branchHasUser = existingUsers.Any(u => u.BranchId == request.BranchId);

                if (branchHasUser)
                {
                    return BadRequest(new { message = "This branch already has a user. Only one user is allowed per branch." });
                }
            }

            var user = await _userManagementService.CreateAsync(request);

            return CreatedAtAction(
                nameof(GetById),
                new { id = user.Id },
                user);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserDto request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("User ID is required.");
        }

        request.Id = id;

        try
        {
            if (request.Role != Roles.HeadOfficeAdmin)
            {
                var existingUsers = await _userManagementService.GetAllAsync();

                var branchHasOtherUser = existingUsers.Any(u =>
                    u.BranchId == request.BranchId &&
                    u.Id != id);

                if (branchHasOtherUser)
                {
                    return BadRequest(new { message = "This branch already has a user. Only one user is allowed per branch." });
                }
            }

            var updated = await _userManagementService.UpdateAsync(request);

            if (!updated)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetActiveStatus(string id, [FromBody] SetUserStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("User ID is required.");
        }

        try
        {
            var updated = await _userManagementService.SetActiveStatusAsync(id, request.IsActive);

            if (!updated)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "User ID is required." });
        }

        try
        {
            var done = await _userManagementService.ResetPasswordAsync(id, request.NewPassword);

            if (!done)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("User ID is required.");
        }

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.Equals(currentUserId, id, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "You cannot delete your own account while logged in." });
        }

        try
        {
            var deleted = await _userManagementService.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class SetUserStatusRequest
{
    public bool IsActive { get; set; }
}

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}