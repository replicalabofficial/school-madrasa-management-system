using Microsoft.AspNetCore.Identity;

namespace SchoolMadrasaManagementSystem.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;
        public int? BranchId { get; set; } // Head Office = null, Branch User = BranchId

        public Branch? Branch { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
