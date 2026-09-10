namespace SchoolMadrasaManagementSystem.Entities;

public class Staff
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;
}