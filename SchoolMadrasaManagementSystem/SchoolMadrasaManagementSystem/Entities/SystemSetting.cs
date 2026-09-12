using System.ComponentModel.DataAnnotations;

namespace SchoolMadrasaManagementSystem.Entities
{
    public class SystemSetting
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string InstitutionName { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(50)]
        public string? Phone { get; set; }

        [MaxLength(150)]
        public string? Email { get; set; }

        [Required]
        [MaxLength(10)]
        public string Currency { get; set; } = "PKR";

        [Required]
        [MaxLength(30)]
        public string DateFormat { get; set; } = "dd/MM/yyyy";

        [Required]
        [MaxLength(50)]
        public string AcademicSession { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? LogoPath { get; set; }

        public bool IsActive { get; set; } = true;
    }
}