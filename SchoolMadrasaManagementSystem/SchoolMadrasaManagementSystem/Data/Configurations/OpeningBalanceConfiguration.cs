using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Data.Configurations;

public class OpeningBalanceConfiguration : IEntityTypeConfiguration<OpeningBalance>
{
    public void Configure(EntityTypeBuilder<OpeningBalance> builder)
    {
        builder.ToTable("OpeningBalances");

        builder.Property(x => x.EntryType).HasMaxLength(10).IsRequired();
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Description).HasMaxLength(500);

        // Never delete accounts or branches together with their opening balances
        builder.HasOne(x => x.ChartOfAccount)
            .WithMany()
            .HasForeignKey(x => x.ChartOfAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Branch)
            .WithMany()
            .HasForeignKey(x => x.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        // One opening balance per account per branch
        builder.HasIndex(x => new { x.ChartOfAccountId, x.BranchId }).IsUnique();
    }
}