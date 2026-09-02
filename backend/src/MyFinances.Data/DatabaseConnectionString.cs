using Npgsql;

namespace MyFinances.Data;

/// <summary>
/// Normalizes a connection string. Accepts either a native Npgsql key/value string
/// or a URL of the form <c>postgres://user:pass@host:port/db?sslmode=require</c>
/// (as handed out by Neon, Railway, Fly, Heroku, …) and converts it.
/// </summary>
public static class DatabaseConnectionString
{
    public static string Normalize(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException("Connection string is empty.");

        var isUrl = raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
                    || raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);
        if (!isUrl)
            return raw;

        var uri = new Uri(raw);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
        };

        foreach (var part in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split('=', 2);
            var key = Uri.UnescapeDataString(kv[0]);
            var value = kv.Length > 1 ? Uri.UnescapeDataString(kv[1]) : string.Empty;

            switch (key.ToLowerInvariant())
            {
                case "sslmode":
                    if (Enum.TryParse<SslMode>(value, ignoreCase: true, out var mode))
                        builder.SslMode = mode;
                    break;
                case "channel_binding":
                    // Npgsql negotiates channel binding automatically; ignore.
                    break;
                default:
                    builder[key] = value;
                    break;
            }
        }

        return builder.ConnectionString;
    }
}
