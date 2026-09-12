namespace SchoolMadrasaManagementSystem.DTOs.Settings
{
    public class UpdateSystemSettingDto
    {
        public string InstitutionName { get; set; } = string.Empty;

        public string? Address { get; set; }

        public string? Phone { get; set; }

        public string? Email { get; set; }

        public string Currency { get; set; } = "PKR";

        public string DateFormat { get; set; } = "dd/MM/yyyy";

        public string AcademicSession { get; set; } = string.Empty;

        public string? LogoPath { get; set; }

        public bool IsActive { get; set; } = true;
    }
}