namespace SchoolMadrasaManagementSystem.DTOs.Auth;

public class LoginResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? BranchId { get; set; }
    public List<string> EnabledModules { get; set; } = new();

}