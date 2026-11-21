using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Data.Configurations;

public class JournalEntryConfiguration : IEntityTypeConfiguration<JournalEntry>
{
    public void Configure(EntityTypeBuilder<JournalEntry> builder)
    {
        builder.ToTable("JournalEntries");

        builder.Property(x => x.EntryNumber).HasMaxLength(30).IsRequired();
        builder.HasIndex(x => x.EntryNumber).IsUnique();
        builder.Property(x => x.Description).HasMaxLength(500).IsRequired();
        builder.Property(x => x.EntryType).HasMaxLength(30).IsRequired();
        builder.Property(x => x.CreatedByName).HasMaxLength(200);

        builder.HasMany(x => x.Lines)
            .WithOne(x => x.JournalEntry)
            .HasForeignKey(x => x.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class JournalEntryLineConfiguration : IEntityTypeConfiguration<JournalEntryLine>
{
    public void Configure(EntityTypeBuilder<JournalEntryLine> builder)
    {
        builder.ToTable("JournalEntryLines");

        builder.Property(x => x.Debit).HasPrecision(18, 2);
        builder.Property(x => x.Credit).HasPrecision(18, 2);
        builder.Property(x => x.Note).HasMaxLength(300);

        builder.HasOne(x => x.ChartOfAccount)
            .WithMany()
            .HasForeignKey(x => x.ChartOfAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Branch)
            .WithMany()
            .HasForeignKey(x => x.BranchId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AccountingPeriodLockConfiguration : IEntityTypeConfiguration<AccountingPeriodLock>
{
    public void Configure(EntityTypeBuilder<AccountingPeriodLock> builder)
    {
        builder.ToTable("AccountingPeriodLocks");
        builder.Property(x => x.UpdatedByName).HasMaxLength(200);
    }
}