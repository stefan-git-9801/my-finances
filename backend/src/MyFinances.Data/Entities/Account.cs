namespace MyFinances.Data.Entities;

/// <summary>A cash pot or bank account. Balances are derived from the starting balance plus bookings.</summary>
public class Account
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public AccountType Type { get; set; }

    /// <summary>Balance the account had before the first recorded booking.</summary>
    public decimal StartingBalance { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<Transaction> Transactions { get; set; } = [];
    public List<Transfer> TransfersFrom { get; set; } = [];
    public List<Transfer> TransfersTo { get; set; } = [];
}
