using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Configurations;

public class FeePostingConfiguration : IEntityTypeConfiguration<FeePosting>
{
    public void Configure(EntityTypeBuilder<FeePosting> builder)
    {
        builder.ToTable("FeePostings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Class).HasMaxLength(100);
        builder.Property(x => x.PostedBy).IsRequired().HasMaxLength(150);

        builder.Property(x => x.GrossTotal).HasPrecision(18, 2);
        builder.Property(x => x.DiscountTotal).HasPrecision(18, 2);
        builder.Property(x => x.NetTotal).HasPrecision(18, 2);

        builder.HasOne(x => x.Branch)
            .WithMany()
            .HasForeignKey(x => x.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.BranchId, x.Year, x.Month });
    }
}
