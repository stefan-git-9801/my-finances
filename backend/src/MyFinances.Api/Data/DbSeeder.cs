using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MyFinances.Data;
using MyFinances.Data.Auth;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Data;

/// <summary>
/// First-start seeding: the default category list (always) and the single application user
/// (from configuration). Both are idempotent.
/// </summary>
public static class DbSeeder
{
    private static readonly (string Name, CategoryKind Kind)[] DefaultCategories =
    [
        ("Lebensmittel", CategoryKind.Expense),
        ("Wohnen/Miete", CategoryKind.Expense),
        ("Freizeit", CategoryKind.Expense),
        ("Transport", CategoryKind.Expense),
        ("Gesundheit", CategoryKind.Expense),
        ("Versicherung", CategoryKind.Expense),
        ("Sonstiges", CategoryKind.Expense),
        ("Gehalt", CategoryKind.Income),
        ("Sonstige Einnahmen", CategoryKind.Income),
    ];

    public static async Task SeedCategoriesAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();

        if (await db.Categories.AnyAsync())
            return;

        var now = DateTimeOffset.UtcNow;
        db.Categories.AddRange(DefaultCategories.Select(c => new Category
        {
            Id = Guid.NewGuid(),
            Name = c.Name,
            Kind = c.Kind,
            IsDefault = true,
            CreatedAt = now,
        }));

        await db.SaveChangesAsync();
    }

    public static async Task SeedAdminUserAsync(IServiceProvider services)
    {
        var config = services.GetRequiredService<IConfiguration>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");

        var email = config["ADMIN_EMAIL"] ?? config["Admin:Email"];
        var password = config["ADMIN_PASSWORD"] ?? config["Admin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "No ADMIN_EMAIL / ADMIN_PASSWORD configured – no application user will be created. " +
                "Set both to enable login.");
            return;
        }

        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        if (await userManager.FindByEmailAsync(email) is not null)
            return;

        var user = new AppUser { UserName = email, Email = email, EmailConfirmed = true };
        var result = await userManager.CreateAsync(user, password);

        if (result.Succeeded)
            logger.LogInformation("Created application user {Email}.", email);
        else
            logger.LogError("Could not create application user: {Errors}",
                string.Join("; ", result.Errors.Select(e => e.Description)));
    }
}
