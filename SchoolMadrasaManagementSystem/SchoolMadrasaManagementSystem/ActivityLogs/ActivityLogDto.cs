namespace SchoolMadrasaManagementSystem.ActivityLogs;

public class ActivityLogDto
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;

    public string Module { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public TimeSpan Time { get; set; }

    public int? BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}