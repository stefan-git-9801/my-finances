using MyFinances.Data;

namespace MyFinances.Data.Tests;

public class DatabaseConnectionStringTests
{
    [Fact]
    public void PassesThroughNativeKeyValueString()
    {
        const string input = "Host=localhost;Port=5432;Database=myfinances;Username=me;Password=secret";

        Assert.Equal(input, DatabaseConnectionString.Normalize(input));
    }

    [Fact]
    public void ConvertsPostgresUrlToNpgsqlFormat()
    {
        const string url = "postgresql://user:p%40ss@ep-cool-name.eu-central-1.aws.neon.tech/neondb?sslmode=require";

        var result = DatabaseConnectionString.Normalize(url);

        Assert.Contains("Host=ep-cool-name.eu-central-1.aws.neon.tech", result);
        Assert.Contains("Database=neondb", result);
        Assert.Contains("Username=user", result);
        Assert.Contains("Password=p@ss", result);
        Assert.Contains("SSL Mode=Require", result);
    }

    [Fact]
    public void ThrowsOnEmptyInput()
    {
        Assert.Throws<InvalidOperationException>(() => DatabaseConnectionString.Normalize("  "));
    }
}
