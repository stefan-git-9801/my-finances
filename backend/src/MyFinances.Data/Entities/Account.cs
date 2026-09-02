namespace MyFinances.Data.Entities;

public class Account
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Currency { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<Transaction> Transactions { get; set; } = [];
}
