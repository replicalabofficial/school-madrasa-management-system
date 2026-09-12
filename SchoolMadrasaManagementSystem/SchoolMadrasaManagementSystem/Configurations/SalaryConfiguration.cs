using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Configurations;

public class SalaryConfiguration : IEntityTypeConfiguration<Salary>
{
    public void Configure(EntityTypeBuilder<Salary> builder)
    {
        builder.ToTable("Salaries");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SalaryMonth)
            .IsRequired()
            .HasMaxLength(7);

        builder.Property(x => x.BasicSalary)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(x => x.Allowances)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(x => x.Deductions)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(x => x.NetSalary)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(x => x.PaidAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(x => x.RemainingAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(x => x.Notes)
            .HasMaxLength(500);

        builder.HasOne(x => x.Staff)
            .WithMany()
            .HasForeignKey(x => x.StaffId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Branch)
            .WithMany()
            .HasForeignKey(x => x.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        // One salary record per employee per month
        builder.HasIndex(x => new
        {
            x.StaffId,
            x.SalaryMonth
        })
        .IsUnique();
    }
}