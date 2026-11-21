namespace SchoolMadrasaManagementSystem.FeeSetup;

// ---------- Individual student ledger ----------
public class StudentLedgerLineDto
{
    public DateTime Date { get; set; }
    public string Type { get; set; } = string.Empty;   // "Fee" or "Payment"
    public int FeeId { get; set; }
    public string SerialNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Gross { get; set; }
    public decimal Discount { get; set; }
    public decimal Debit { get; set; }    // fee charged (net)
    public decimal Credit { get; set; }   // payment received
    public decimal Balance { get; set; }  // running balance
    public string? DiscountStatus { get; set; }
}

public class FamilyMemberDto
{
    public int StudentId { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? LeftDate { get; set; }
    public decimal Due { get; set; }
}

public class StudentLedgerDto
{
    public int StudentId { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string? FatherName { get; set; }
    public string? FatherCnic { get; set; }
    public string? ParentPhone { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LeftDate { get; set; }
    public decimal MonthlyFee { get; set; }
    public decimal MonthlyDiscount { get; set; }
    public string? DiscountStatus { get; set; }

    public decimal TotalGross { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalCharged { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal Balance { get; set; }
    public int UnpaidCount { get; set; }
    public decimal PendingDiscountAmount { get; set; }  // discount not yet approved (not deducted)

    public List<StudentLedgerLineDto> Lines { get; set; } = new();
    public List<FamilyMemberDto> Family { get; set; } = new();  // siblings (not including this student)
    public decimal FamilyDue { get; set; }  // this student + siblings
}

// ---------- Class fee summary ----------
public class ClassFeeSummaryRowDto
{
    public string Class { get; set; } = string.Empty;
    public int ActiveStudents { get; set; }
    public int FeeCount { get; set; }
    public decimal Gross { get; set; }
    public decimal Discount { get; set; }
    public decimal Net { get; set; }
    public decimal Received { get; set; }
    public decimal Balance { get; set; }
    public int UnpaidCount { get; set; }
}

public class ClassFeeSummaryDto
{
    public string Period { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public List<ClassFeeSummaryRowDto> Rows { get; set; } = new();
    public ClassFeeSummaryRowDto Total { get; set; } = new() { Class = "Total" };
}

// ---------- Left students dues ----------
public class LeftStudentDueDto
{
    public int StudentId { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public DateTime? LeftDate { get; set; }
    public string? FatherName { get; set; }
    public string? ParentPhone { get; set; }
    public int UnpaidCount { get; set; }
    public decimal Due { get; set; }
    public DateTime? OldestDueDate { get; set; }
    // Siblings still studying — dues can be recovered through them
    public List<FamilyMemberDto> ActiveSiblings { get; set; } = new();
}

public class LeftStudentsDuesDto
{
    public int StudentCount { get; set; }
    public decimal TotalDue { get; set; }
    public int RecoverableThroughSiblings { get; set; }
    public decimal RecoverableAmount { get; set; }
    public List<LeftStudentDueDto> Rows { get; set; } = new();
}
