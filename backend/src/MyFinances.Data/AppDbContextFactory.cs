using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MyFinances.Data;

/// <summary>
/// Used by <c>dotnet ef</c> at design time so migrations can be added/applied
/// without booting the full API. Reads <c>ConnectionStrings__AppDb</c> if set,
/// otherwise falls back to the local Podman database.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var raw = Environment.GetEnvironmentVariable("ConnectionStrings__AppDb")
                  ?? Environment.GetEnvironmentVariable("DATABASE_URL")
                  ?? "Host=localhost;Port=5432;Database=myfinances;Username=myfinances;Password=myfinances";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(DatabaseConnectionString.Normalize(raw))
            .Options;

        return new AppDbContext(options);
    }
}
