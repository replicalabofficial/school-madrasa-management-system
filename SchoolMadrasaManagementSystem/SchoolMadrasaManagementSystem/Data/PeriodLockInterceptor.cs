using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Data;

// Blocks adding, changing or deleting money entries dated on/before the lock date.
// Works for every module automatically because it runs on SaveChanges.
public class PeriodLockInterceptor : SaveChangesInterceptor
{
    // Entity type -> date properties that place it in a period
    private static readonly Dictionary<Type, string[]> DateProperties = new()
    {
        { typeof(Income), new[] { "Date" } },
        { typeof(Expense), new[] { "Date" } },
        { typeof(Fee), new[] { "Date", "PaidDate" } },
        { typeof(SalaryPayment), new[] { "PaymentDate" } },
        { typeof(SalaryAdjustment), new[] { "Date" } },
        { typeof(OpeningBalance), new[] { "Date" } },
        { typeof(JournalEntry), new[] { "Date" } },
    };

    // Changing only these never changes the accounts
    private static readonly HashSet<string> IgnoredProperties = new(StringComparer.Ordinal)
    {
        "IsReconciled", "UpdatedAt", "ModifiedAt", "LastModified"
    };

    // Fee: payment-related fields belong to the paid date, the rest to the fee date
    private static readonly HashSet<string> FeePaymentProperties = new(StringComparer.Ordinal)
    {
        "Status", "PaidDate", "SourceAccountId"
    };

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is AppDbContext db)
        {
            CheckAsync(db, CancellationToken.None).GetAwaiter().GetResult();
        }

        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is AppDbContext db)
        {
            await CheckAsync(db, cancellationToken);
        }

        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static async Task CheckAsync(AppDbContext db, CancellationToken ct)
    {
        var entries = db.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Where(e => DateProperties.ContainsKey(e.Entity.GetType()))
            .ToList();

        if (entries.Count == 0)
        {
            return;
        }

        var lockedUpTo = await db.AccountingPeriodLocks
            .AsNoTracking()
            .Select(x => (DateTime?)x.LockedUpTo)
            .FirstOrDefaultAsync(ct);

        if (!lockedUpTo.HasValue)
        {
            return;
        }

        var lockDate = lockedUpTo.Value.Date;

        foreach (var entry in entries)
        {
            foreach (var date in GetRelevantDates(entry))
            {
                if (date.HasValue && date.Value.Date <= lockDate)
                {
                    throw new PeriodLockedException(
                        $"The books are locked up to {lockDate:dd MMM yyyy}. Entries on or before this date cannot be added, changed or deleted. Ask Head Office to unlock the period first.");
                }
            }
        }
    }

    private static IEnumerable<DateTime?> GetRelevantDates(EntityEntry entry)
    {
        var dateProps = DateProperties[entry.Entity.GetType()];

        if (entry.State == EntityState.Added)
        {
            return dateProps.Select(p => ReadDate(entry, p, original: false));
        }

        if (entry.State == EntityState.Deleted)
        {
            return dateProps.Select(p => ReadDate(entry, p, original: true));
        }

        // Modified: only look at what actually changed
        var changed = entry.Properties
            .Where(p => p.IsModified && !IgnoredProperties.Contains(p.Metadata.Name))
            .Select(p => p.Metadata.Name)
            .ToList();

        if (changed.Count == 0)
        {
            return Enumerable.Empty<DateTime?>();
        }

        var propsToCheck = dateProps;

        if (entry.Entity is Fee)
        {
            var paymentChanged = changed.Any(FeePaymentProperties.Contains);
            var feeChanged = changed.Any(c => !FeePaymentProperties.Contains(c));

            propsToCheck = (paymentChanged, feeChanged) switch
            {
                (true, false) => new[] { "PaidDate" },
                (false, true) => new[] { "Date" },
                _ => dateProps
            };
        }

        return propsToCheck.SelectMany(p => new[]
        {
            ReadDate(entry, p, original: true),
            ReadDate(entry, p, original: false)
        });
    }

    private static DateTime? ReadDate(EntityEntry entry, string propertyName, bool original)
    {
        var property = entry.Properties.FirstOrDefault(p => p.Metadata.Name == propertyName);
        if (property is null)
        {
            return null;
        }

        var value = original ? property.OriginalValue : property.CurrentValue;
        return value as DateTime?;
    }
}

// Thrown when someone tries to add, change or delete an entry inside a locked period.
// Turned into a friendly 400 message by PeriodLockExceptionMiddleware.
public class PeriodLockedException : InvalidOperationException
{
    public PeriodLockedException(string message) : base(message) { }
}