namespace SchoolMadrasaManagementSystem.Entities;

// Single row: books are locked up to and including LockedUpTo.
public class AccountingPeriodLock
{
    public int Id { get; set; }

    public DateTime LockedUpTo { get; set; }

    public string UpdatedByName { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}