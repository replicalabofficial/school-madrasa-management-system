namespace SchoolMadrasaManagementSystem.Entities;

public class ActivityLog
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;

    public string Module { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public TimeSpan Time { get; set; }

    public int? BranchId { get; set; }

    public Branch? Branch { get; set; }

    public string Status { get; set; } = "Success";
}