using Microsoft.EntityFrameworkCore;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Data;

/// <summary>Seeds demo data in Development so the UI has something to show.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();

        if (await db.Accounts.AnyAsync())
            return;

        var now = DateTimeOffset.UtcNow;
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Name = "Girokonto",
            Currency = "EUR",
            CreatedAt = now,
            Transactions =
            {
                new Transaction
                {
                    Id = Guid.NewGuid(),
                    Amount = 2500m,
                    Description = "Gehalt",
                    BookedOn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5)),
                    CreatedAt = now,
                },
                new Transaction
                {
                    Id = Guid.NewGuid(),
                    Amount = -42.50m,
                    Description = "Einkauf Supermarkt",
                    BookedOn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
                    CreatedAt = now,
                },
            },
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync();
    }
}
