namespace SchoolMadrasaManagementSystem.Entities;

public class ChartOfAccount
{
    public int Id { get; set; }

    public string AccountId { get; set; } = string.Empty;

    public string AccountDescription { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}