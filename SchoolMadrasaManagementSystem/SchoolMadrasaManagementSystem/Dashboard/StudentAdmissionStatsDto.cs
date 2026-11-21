namespace SchoolMadrasaManagementSystem.Dashboard;

public class StudentAdmissionStatsDto
{
    public int NewAdmissionsThisYear { get; set; }
    public int LeftThisYear { get; set; }
    public int NewAdmissionsLastYear { get; set; }
    public int LeftLastYear { get; set; }
    public List<NewAdmissionDto> RecentAdmissions { get; set; } = new();
}

public class NewAdmissionDto
{
    public int StudentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}