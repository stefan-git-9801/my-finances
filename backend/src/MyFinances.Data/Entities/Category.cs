namespace MyFinances.Data.Entities;

/// <summary>A user-defined bucket for bookings, optionally with a monthly budget.</summary>
public class Category
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public CategoryKind Kind { get; set; }

    /// <summary>Optional monthly budget. Applies to every month; <c>null</c> means "no budget".</summary>
    public decimal? MonthlyBudget { get; set; }

    /// <summary>True for the categories seeded on first start. They can still be edited or deleted.</summary>
    public bool IsDefault { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<Transaction> Transactions { get; set; } = [];
}
