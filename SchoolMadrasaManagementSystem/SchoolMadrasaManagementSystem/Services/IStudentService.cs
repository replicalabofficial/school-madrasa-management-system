using SchoolMadrasaManagementSystem.Entities;
using SchoolMadrasaManagementSystem.Students;

namespace SchoolMadrasaManagementSystem.Services;

public interface IStudentService
{
    Task<List<Student>> GetAllAsync();

    Task<Student?> GetByIdAsync(int id);

    Task<Student> CreateAsync(Student student);

    Task<bool> UpdateAsync(Student student);

    Task<bool> MarkLeftAsync(int id, DateTime leftDate);

    Task<bool> DeleteAsync(int id);

    // Excel/CSV import: preview (Commit = false) or save valid rows (Commit = true)
    Task<StudentImportResultDto> ImportAsync(StudentImportRequest request);

    // Move selected students to a new class, or mark them as Left / Passed out
    Task<StudentPromotionResultDto> PromoteAsync(StudentPromotionRequest request);

    // Standing monthly discount approval (Head Office)
    Task<List<Student>> GetPendingDiscountsAsync();
    Task<bool> ApproveDiscountAsync(int id);
    Task<bool> RejectDiscountAsync(int id);
}