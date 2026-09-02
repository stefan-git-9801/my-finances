using System.Globalization;
using System.Text;

namespace MyFinances.Data.Csv;

/// <summary>
/// Builds CSV text for opening directly in German Excel: semicolon separator, comma decimal
/// separator, UTF-8 with BOM. Culture-independent (the app runs with InvariantGlobalization).
/// </summary>
public static class CsvWriter
{
    /// <summary>Formats a decimal with a comma decimal separator and no thousands separator.</summary>
    public static string Amount(decimal value) =>
        value.ToString("0.00", CultureInfo.InvariantCulture).Replace('.', ',');

    /// <summary>Joins one row's fields with <c>;</c>, quoting where needed.</summary>
    public static string Row(params string[] fields) => string.Join(';', fields.Select(Escape));

    /// <summary>UTF-8 bytes with a leading BOM for the given lines.</summary>
    public static byte[] ToFileBytes(IEnumerable<string> lines)
    {
        var text = string.Join("\r\n", lines) + "\r\n";
        var bom = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(text);
        var result = new byte[bom.Length + body.Length];
        bom.CopyTo(result, 0);
        body.CopyTo(result, bom.Length);
        return result;
    }

    /// <summary>Formats a date as <c>dd.MM.yyyy</c> (literal dots, no culture separator).</summary>
    public static string Date(DateOnly date) => date.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

    private static string Escape(string field)
    {
        if (field.Contains(';') || field.Contains('"') || field.Contains('\n') || field.Contains('\r'))
            return '"' + field.Replace("\"", "\"\"") + '"';
        return field;
    }
}
