namespace SchoolMadrasaManagementSystem.Entities
{
    public class Branch
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Code { get; set; } = string.Empty;

        public string? Address { get; set; }

        public bool IsActive { get; set; } = true;
    }
}