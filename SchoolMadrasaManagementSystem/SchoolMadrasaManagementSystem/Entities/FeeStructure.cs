namespace SchoolMadrasaManagementSystem.Entities;

// Class-wise fee setup of one branch for one session (e.g. "2026-27")
public class FeeStructure
{
    public int Id { get; set; }

    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    public string Session { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;

    // Monthly fee of students already studying
    public decimal MonthlyFee { get; set; }

    // Monthly fee of new admissions of this session (usually higher)
    public decimal NewAdmissionMonthlyFee { get; set; }

    // One-time charges (filled automatically when a new admission is made)
    public decimal AdmissionFee { get; set; }
    public decimal FormFee { get; set; }
    public decimal StationeryFee { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
