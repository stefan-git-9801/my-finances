using Microsoft.EntityFrameworkCore;
using MyFinances.Data;
using MyFinances.Data.Entities;
using MyFinances.Data.Recurring;

namespace MyFinances.Api.Recurring;

/// <summary>
/// Turns due months of every active <see cref="RecurringTemplate"/> into real <see cref="Transaction"/>
/// rows. Runs at startup and before read-only endpoints (see <see cref="RecurringMaterializationFilter"/>).
/// Idempotent: an occurrence that already exists for a template + date is skipped.
/// </summary>
public sealed class RecurringMaterializer(AppDbContext db, TimeProvider clock, ILogger<RecurringMaterializer> logger)
{
    public async Task<int> MaterializeDueAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

        var templates = await db.RecurringTemplates
            .Where(t => t.IsActive)
            .ToListAsync(ct);

        if (templates.Count == 0)
            return 0;

        var created = 0;

        foreach (var template in templates)
        {
            var dueDates = RecurringSchedule
                .DueBookingDates(template.StartDate, template.EndDate, template.DayOfMonth, template.LastMaterializedOn, today)
                .ToList();

            if (dueDates.Count == 0)
                continue;

            var existing = await db.Transactions
                .Where(x => x.RecurringTemplateId == template.Id)
                .Select(x => x.BookedOn)
                .ToListAsync(ct);
            var existingDates = existing.ToHashSet();

            foreach (var date in dueDates)
            {
                if (existingDates.Contains(date))
                    continue;

                db.Transactions.Add(new Transaction
                {
                    Id = Guid.NewGuid(),
                    AccountId = template.AccountId,
                    CategoryId = template.CategoryId,
                    Type = template.Type,
                    Amount = template.Amount,
                    Note = template.Note,
                    BookedOn = date,
                    RecurringTemplateId = template.Id,
                    CreatedAt = clock.GetUtcNow(),
                });
                created++;
            }

            var newest = dueDates[^1];
            if (template.LastMaterializedOn is null || newest > template.LastMaterializedOn)
                template.LastMaterializedOn = newest;
        }

        if (created > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Materialised {Count} recurring booking(s).", created);
        }

        return created;
    }
}
