namespace SchoolMadrasaManagementSystem.Entities;

public class BranchModulePermission
{
    public int Id { get; set; }
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public string ModuleKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
}