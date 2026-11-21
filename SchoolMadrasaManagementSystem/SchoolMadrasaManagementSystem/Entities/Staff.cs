using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Entities;

public class Staff : IBranchEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public string Designation { get; set; } = "Teacher";
}

public static class StaffDesignations
{
    public const string Coordinator = "Coordinator";
    public const string Teacher = "Teacher";
    public const string Admin = "Admin";

    public static readonly string[] All = { Coordinator, Teacher, Admin };
}