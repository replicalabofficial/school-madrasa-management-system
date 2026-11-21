using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Entities;

public class Voucher : IBranchEntity
{
    public int Id { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string VoucherType { get; set; } = string.Empty;
    public int TransactionId { get; set; }
    public DateTime VoucherDate { get; set; }
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public string AccountDescription { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime? SentAt { get; set; }
}