using Microsoft.AspNetCore.Identity;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            // 1. Seed Roles
            string[] roleNames = { Roles.HeadOfficeAdmin, Roles.BranchAdmin, Roles.BranchUser };

            foreach (var roleName in roleNames)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                }
            }

            // 2. Seed Default HeadOffice Admin User
            var headOfficeEmail = "headoffice@admin.com";
            var adminUser = await userManager.FindByEmailAsync(headOfficeEmail);

            if (adminUser == null)
            {
                var newAdmin = new ApplicationUser
                {
                    UserName = headOfficeEmail,
                    Email = headOfficeEmail,
                    FullName = "System HeadOffice Admin",
                    BranchId = null, // Global Access (No specific branch)
                    IsActive = true,
                    EmailConfirmed = true
                };

                var createResult = await userManager.CreateAsync(newAdmin, "Admin@123456");

                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(newAdmin, Roles.HeadOfficeAdmin);
                }
            }
        }
    }
}