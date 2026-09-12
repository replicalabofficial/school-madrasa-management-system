using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Branch> Branches { get; set; }

    public DbSet<Student> Students { get; set; }

    public DbSet<Staff> Staff { get; set; }

    public DbSet<Fee> Fees { get; set; }

    public DbSet<Income> Income { get; set; }

    public DbSet<Expense> Expenses { get; set; }

    public DbSet<ChartOfAccount> ChartOfAccounts { get; set; }

    public DbSet<Salary> Salaries { get; set; }

    public DbSet<ActivityLog> ActivityLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}