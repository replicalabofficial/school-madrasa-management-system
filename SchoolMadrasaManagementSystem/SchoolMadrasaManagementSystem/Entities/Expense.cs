namespace SchoolMadrasaManagementSystem.Entities;

public class Expense
{
    public int Id { get; set; }

    public DateTime Date { get; set; }

    public string Category { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    public int BranchId { get; set; }

    public Branch Branch { get; set; } = null!;

    public string? Notes { get; set; }
}