namespace MyFinances.Data.Entities;

/// <summary>
/// Template for a booking that repeats every month on a fixed day (rent, salary, subscriptions).
/// A background pass materialises due months into real <see cref="Transaction"/> rows.
/// </summary>
public class RecurringTemplate
{
    public Guid Id { get; set; }

    public Guid AccountId { get; set; }
    public Account? Account { get; set; }

    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public TransactionType Type { get; set; }

    /// <summary>Always positive.</summary>
    public decimal Amount { get; set; }

    public string? Note { get; set; }

    /// <summary>Day of month (1–31); clamped to the last day for shorter months.</summary>
    public int DayOfMonth { get; set; }

    /// <summary>First month the template applies (day component is ignored).</summary>
    public DateOnly StartDate { get; set; }

    /// <summary>Optional last month the template applies.</summary>
    public DateOnly? EndDate { get; set; }

    /// <summary>Booking date of the most recently materialised occurrence.</summary>
    public DateOnly? LastMaterializedOn { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    public List<Transaction> GeneratedTransactions { get; set; } = [];
}
