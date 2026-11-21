using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Configurations;

public class StudentConfiguration : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        builder.ToTable("Students");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.Class)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.FatherName).HasMaxLength(150);
        builder.Property(x => x.FatherCnic).HasMaxLength(20);
        builder.Property(x => x.ParentPhone).HasMaxLength(20);
        builder.Property(x => x.DiscountStatus).HasMaxLength(30);
        builder.Property(x => x.MonthlyFee).HasPrecision(18, 2);
        builder.Property(x => x.MonthlyDiscount).HasPrecision(18, 2);

        builder.HasIndex(x => x.FatherCnic);
        builder.HasIndex(x => x.ParentPhone);

        builder.HasOne(x => x.Branch)
            .WithMany()
            .HasForeignKey(x => x.BranchId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}