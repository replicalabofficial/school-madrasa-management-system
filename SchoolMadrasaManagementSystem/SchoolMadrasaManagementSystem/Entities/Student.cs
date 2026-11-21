namespace SchoolMadrasaManagementSystem.Entities;

public class Student
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public string GrNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public DateTime? LeftDate { get; set; }

    // Family / contact (siblings are matched by FatherCnic or ParentPhone)
    public string? FatherName { get; set; }
    public string? FatherCnic { get; set; }
    public string? ParentPhone { get; set; }
    public DateTime? AdmissionDate { get; set; }

    // Monthly fee of this student (filled from Fee Setup, can be changed)
    public decimal MonthlyFee { get; set; }

    // Standing monthly discount — applied to every monthly posting once Head Office approves it
    public decimal MonthlyDiscount { get; set; }
    public string? DiscountStatus { get; set; } // null, "PendingApproval", "Approved"
}