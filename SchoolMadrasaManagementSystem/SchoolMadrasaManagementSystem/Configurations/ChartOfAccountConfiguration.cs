using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Configurations;

public class ChartOfAccountConfiguration : IEntityTypeConfiguration<ChartOfAccount>
{
    public void Configure(EntityTypeBuilder<ChartOfAccount> builder)
    {
        builder.ToTable("ChartOfAccounts");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.AccountId)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.AccountDescription)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.AccountType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.HasIndex(x => x.AccountId)
            .IsUnique();
    }
}