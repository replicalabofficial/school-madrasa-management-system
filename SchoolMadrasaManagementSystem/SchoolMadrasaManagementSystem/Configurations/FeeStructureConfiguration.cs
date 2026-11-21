using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Configurations;

public class FeeStructureConfiguration : IEntityTypeConfiguration<FeeStructure>
{
    public void Configure(EntityTypeBuilder<FeeStructure> builder)
    {
        builder.ToTable("FeeStructures");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Session).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Class).IsRequired().HasMaxLength(100);

        builder.Property(x => x.MonthlyFee).HasPrecision(18, 2);
        builder.Property(x => x.NewAdmissionMonthlyFee).HasPrecision(18, 2);
        builder.Property(x => x.AdmissionFee).HasPrecision(18, 2);
        builder.Property(x => x.FormFee).HasPrecision(18, 2);
        builder.Property(x => x.StationeryFee).HasPrecision(18, 2);

        builder.HasOne(x => x.Branch)
            .WithMany()
            .HasForeignKey(x => x.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        // One row per branch + session + class
        builder.HasIndex(x => new { x.BranchId, x.Session, x.Class }).IsUnique();
    }
}
