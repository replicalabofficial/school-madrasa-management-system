namespace SchoolMadrasaManagementSystem.Entities;

public class Student
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Class { get; set; } = string.Empty;

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;
}