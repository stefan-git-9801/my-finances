namespace MyFinances.Data.Entities;

/// <summary>
/// Moves money between two own accounts (e.g. cash withdrawal from the current account).
/// Counts towards account balances but is excluded from income/expense reports.
/// </summary>
public class Transfer
{
    public Guid Id { get; set; }

    public Guid FromAccountId { get; set; }
    public Account? FromAccount { get; set; }

    public Guid ToAccountId { get; set; }
    public Account? ToAccount { get; set; }

    /// <summary>Always positive.</summary>
    public decimal Amount { get; set; }

    public string? Note { get; set; }
    public DateOnly BookedOn { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
