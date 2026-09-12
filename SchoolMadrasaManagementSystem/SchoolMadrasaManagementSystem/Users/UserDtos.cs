namespace SchoolMadrasaManagementSystem.Users;

public class UserDto
{
    public string Id { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public int? BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;
}


public class CreateUserDto
{
    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public int? BranchId { get; set; }
}


public class UpdateUserDto
{
    public string Id { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public int? BranchId { get; set; }

    public bool IsActive { get; set; }
}