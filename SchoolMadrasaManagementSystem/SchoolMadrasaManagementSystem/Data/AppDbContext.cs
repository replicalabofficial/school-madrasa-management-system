using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>

    {

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)

        {
        }
        public DbSet<BranchModulePermission> BranchModulePermissions { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Staff> Staff { get; set; }
        public DbSet<Fee> Fees { get; set; }
        public DbSet<Income> Incomes { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<ChartOfAccount> ChartOfAccounts { get; set; }
        public DbSet<Salary> Salaries { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }

        public DbSet<SalaryPayment> SalaryPayments { get; set; }

        public DbSet<Voucher> Vouchers { get; set; }

        public DbSet<SalaryAdjustment> SalaryAdjustments { get; set; }

        public DbSet<Income> Income => Incomes;

        public DbSet<FeeCategoryAccountMapping> FeeCategoryAccountMappings { get; set; }

        public DbSet<OpeningBalance> OpeningBalances { get; set; }

        public DbSet<JournalEntry> JournalEntries { get; set; }

        public DbSet<JournalEntryLine> JournalEntryLines { get; set; }

        public DbSet<AccountingPeriodLock> AccountingPeriodLocks { get; set; }

        public DbSet<FeeStructure> FeeStructures { get; set; }

        public DbSet<FeePosting> FeePostings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfigurationsFromAssembly(
                typeof(AppDbContext).Assembly);
        }
    }
}