namespace SchoolMadrasaManagementSystem.FeeSetup;

// ---------- Fee Setup ----------
public class FeeStructureRequest
{
    public int BranchId { get; set; }
    public string Session { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public decimal MonthlyFee { get; set; }
    public decimal NewAdmissionMonthlyFee { get; set; }
    public decimal AdmissionFee { get; set; }
    public decimal FormFee { get; set; }
    public decimal StationeryFee { get; set; }
}

public class ApplyFeeStructureRequest
{
    public int BranchId { get; set; }
    public string Session { get; set; } = string.Empty;
    // true = never reduce a student's current monthly fee
    public bool SkipIfLower { get; set; } = true;
    // false = preview only, true = save
    public bool Commit { get; set; }
}

public class ApplyFeeStructureRowDto
{
    public int StudentId { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public decimal OldFee { get; set; }
    public decimal NewFee { get; set; }
    // "Change", "NoChange", "Skipped" (would reduce the fee), "NoSetup" (class not in fee setup)
    public string Status { get; set; } = string.Empty;
}

public class ApplyFeeStructureResultDto
{
    public int TotalStudents { get; set; }
    public int ChangedCount { get; set; }
    public int NoSetupCount { get; set; }
    public bool Committed { get; set; }
    public List<ApplyFeeStructureRowDto> Rows { get; set; } = new();
}

// ---------- Monthly Fee Posting ----------
public class FeePostingRequest
{
    public int BranchId { get; set; }
    public int Month { get; set; }          // 1-12
    public int Year { get; set; }
    public string? Class { get; set; }      // empty = all classes
    public DateTime FeeDate { get; set; }
}

public class FeePostingRowDto
{
    public int StudentId { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public decimal Gross { get; set; }
    public decimal Discount { get; set; }
    public decimal Net { get; set; }
    // null, "Approved" or "PendingApproval"
    public string? DiscountStatus { get; set; }
    // "New", "AlreadyPosted", "NoFee" (student has no monthly fee set)
    public string Status { get; set; } = string.Empty;
}

public class FeePostingClassSummaryDto
{
    public string Class { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public decimal Gross { get; set; }
    public decimal Discount { get; set; }
    public decimal Net { get; set; }
}

public class FeePostingPreviewDto
{
    public string Period { get; set; } = string.Empty;
    public int NewCount { get; set; }
    public int AlreadyPostedCount { get; set; }
    public int NoFeeCount { get; set; }
    public decimal GrossTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal NetTotal { get; set; }
    public int? PostingId { get; set; }     // set after a successful post
    public List<FeePostingClassSummaryDto> Classes { get; set; } = new();
    public List<FeePostingRowDto> Rows { get; set; } = new();
}

public class FeePostingListItemDto
{
    public int Id { get; set; }
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public string? Class { get; set; }
    public DateTime FeeDate { get; set; }
    public int StudentCount { get; set; }
    public decimal GrossTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal NetTotal { get; set; }
    public int PaidCount { get; set; }
    public string PostedBy { get; set; } = string.Empty;
    public DateTime PostedAt { get; set; }
}
