using School_Madrasa_Management_System.Web.Components.Students;

namespace School_Madrasa_Management_System.Web.Services;

public class StudentState
{
    public event Action? OnChange;

    public List<StudentTable.StudentRow> Students { get; } = new()
    {
        new()
        {
            Name = "Abdullah Hassan",
            Guardian = "Hassan Ahmed",
            Phone = "0300-1234567",
            Class = "Grade 5",
            Branch = "Branch 01",
            MonthlyFee = "Rs. 3,500",
            AdmissionDate = "2023-04-01",
            IsActive = true
        },

        new()
        {
            Name = "Fatima Noor",
            Guardian = "Noor Ul Islam",
            Phone = "0311-9876543",
            Class = "Grade 3",
            Branch = "Branch 01",
            MonthlyFee = "Rs. 3,000",
            AdmissionDate = "2022-09-15",
            IsActive = true
        },

        new()
        {
            Name = "Usman Khalid",
            Guardian = "Khalid Mehmood",
            Phone = "0321-5554433",
            Class = "Grade 7",
            Branch = "Branch 01",
            MonthlyFee = "Rs. 4,000",
            AdmissionDate = "2021-04-01",
            IsActive = true
        },

        new()
        {
            Name = "Ayesha Tariq",
            Guardian = "Tariq Iqbal",
            Phone = "0333-2221100",
            Class = "Grade 2",
            Branch = "Branch 01",
            MonthlyFee = "Rs. 2,500",
            AdmissionDate = "2024-01-10",
            IsActive = false
        },

        new()
        {
            Name = "Ibrahim Shah",
            Guardian = "Shah Rukh",
            Phone = "0345-6677889",
            Class = "Grade 6",
            Branch = "Branch 02",
            MonthlyFee = "Rs. 4,500",
            AdmissionDate = "2022-04-01",
            IsActive = true
        },

        new()
        {
            Name = "Zainab Ali",
            Guardian = "Ali Raza",
            Phone = "0301-1122334",
            Class = "Grade 4",
            Branch = "Branch 02",
            MonthlyFee = "Rs. 3,500",
            AdmissionDate = "2023-09-01",
            IsActive = true
        },

        new()
        {
            Name = "Muhammad Bilal",
            Guardian = "Bilal Chaudhry",
            Phone = "0312-4455667",
            Class = "Grade 8",
            Branch = "Branch 02",
            MonthlyFee = "Rs. 5,000",
            AdmissionDate = "2020-04-01",
            IsActive = true
        },

        new()
        {
            Name = "Hira Bibi",
            Guardian = "Farooq Ahmed",
            Phone = "0322-7788990",
            Class = "Grade 1",
            Branch = "Branch 02",
            MonthlyFee = "Rs. 2,000",
            AdmissionDate = "2024-04-01",
            IsActive = true
        }
    };

    public int TotalStudents =>
        Students.Count;

    public int Branch01Students =>
        Students.Count(student =>
            student.Branch == "Branch 01");

    public int Branch02Students =>
        Students.Count(student =>
            student.Branch == "Branch 02");

    public void AddStudent(
        StudentTable.StudentRow student)
    {
        Students.Add(student);

        NotifyStateChanged();
    }

    public void UpdateStudent(
        StudentTable.StudentRow existingStudent,
        StudentTable.StudentRow updatedStudent)
    {
        existingStudent.Name =
            updatedStudent.Name;

        existingStudent.Guardian =
            updatedStudent.Guardian;

        existingStudent.Phone =
            updatedStudent.Phone;

        existingStudent.Class =
            updatedStudent.Class;

        existingStudent.Branch =
            updatedStudent.Branch;

        existingStudent.MonthlyFee =
            updatedStudent.MonthlyFee;

        existingStudent.AdmissionDate =
            updatedStudent.AdmissionDate;

        existingStudent.IsActive =
            updatedStudent.IsActive;

        NotifyStateChanged();
    }

    public void RemoveStudent(
        StudentTable.StudentRow student)
    {
        Students.Remove(student);

        NotifyStateChanged();
    }

    private void NotifyStateChanged()
    {
        OnChange?.Invoke();
    }
}