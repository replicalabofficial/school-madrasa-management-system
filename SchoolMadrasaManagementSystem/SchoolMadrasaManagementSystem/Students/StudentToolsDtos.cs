namespace SchoolMadrasaManagementSystem.Students;

public class StudentImportRowDto
{
    public int RowNumber { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    // Branch code or branch name (Head Office only; ignored for branch users)
    public string? Branch { get; set; }

    // Optional columns
    public string? FatherName { get; set; }
    public string? FatherCnic { get; set; }
    public string? ParentPhone { get; set; }
    public decimal? MonthlyFee { get; set; }
}

public class StudentImportRequest
{
    public List<StudentImportRowDto> Rows { get; set; } = new();
    // false = check only (preview), true = save valid rows
    public bool Commit { get; set; }
}

public class StudentImportRowResultDto
{
    public int RowNumber { get; set; }
    public string GrNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public decimal MonthlyFee { get; set; }
    // "Ready", "Imported" or "Error"
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class StudentImportResultDto
{
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int ErrorRows { get; set; }
    public int ImportedCount { get; set; }
    public bool Committed { get; set; }
    public List<StudentImportRowResultDto> Rows { get; set; } = new();
}

public class StudentPromotionRequest
{
    public List<int> StudentIds { get; set; } = new();
    // New class for the selected students (ignored when MarkAsLeft = true)
    public string? ToClass { get; set; }
    // true = mark the selected students as Left / Passed out
    public bool MarkAsLeft { get; set; }
    public DateTime? LeftDate { get; set; }
}

public class StudentPromotionResultDto
{
    public int UpdatedCount { get; set; }
}