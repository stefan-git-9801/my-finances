using System.Text;
using MyFinances.Data.Csv;

namespace MyFinances.Data.Tests;

public class CsvWriterTests
{
    [Fact]
    public void AmountUsesCommaDecimalAndNoThousandsSeparator()
    {
        Assert.Equal("1234,50", CsvWriter.Amount(1234.5m));
        Assert.Equal("-42,00", CsvWriter.Amount(-42m));
        Assert.Equal("0,00", CsvWriter.Amount(0m));
    }

    [Fact]
    public void RowJoinsWithSemicolonAndQuotesFieldsContainingSeparators()
    {
        Assert.Equal("a;b;c", CsvWriter.Row("a", "b", "c"));
        Assert.Equal("\"a;b\";c", CsvWriter.Row("a;b", "c"));
        Assert.Equal("\"he said \"\"hi\"\"\"", CsvWriter.Row("he said \"hi\""));
    }

    [Fact]
    public void DateIsGermanFormatted()
    {
        Assert.Equal("07.03.2026", CsvWriter.Date(new DateOnly(2026, 3, 7)));
    }

    [Fact]
    public void FileBytesStartWithUtf8Bom()
    {
        var bytes = CsvWriter.ToFileBytes(["Datum;Betrag", "07.03.2026;1,00"]);

        Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, bytes.Take(3).ToArray());
        var text = Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);
        Assert.Equal("Datum;Betrag\r\n07.03.2026;1,00\r\n", text);
    }
}
