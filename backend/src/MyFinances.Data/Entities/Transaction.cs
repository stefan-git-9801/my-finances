namespace MyFinances.Data.Entities;

public class Transaction
{
    public Guid Id { get; set; }

    public Guid AccountId { get; set; }
    public Account? Account { get; set; }

    /// <summary>Signed amount: negative = expense, positive = income.</summary>
    public decimal Amount { get; set; }
    public required string Description { get; set; }
    public DateOnly BookedOn { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
