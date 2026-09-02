namespace MyFinances.Data.Entities;

/// <summary>A single income or expense booking on one account.</summary>
public class Transaction
{
    public Guid Id { get; set; }

    public Guid AccountId { get; set; }
    public Account? Account { get; set; }

    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public TransactionType Type { get; set; }

    /// <summary>Always positive. The direction is carried by <see cref="Type"/>.</summary>
    public decimal Amount { get; set; }

    public string? Note { get; set; }
    public DateOnly BookedOn { get; set; }

    /// <summary>Set when this booking was materialised from a <see cref="RecurringTemplate"/>.</summary>
    public Guid? RecurringTemplateId { get; set; }
    public RecurringTemplate? RecurringTemplate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
