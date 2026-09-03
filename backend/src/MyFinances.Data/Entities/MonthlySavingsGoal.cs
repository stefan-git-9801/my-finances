namespace MyFinances.Data.Entities;

/// <summary>
/// The amount the user wants to set aside in a specific calendar month. One row per (Year, Month).
/// Drives the dashboard's "frei verfügbar" / "täglich verfügbar" figures.
/// </summary>
public class MonthlySavingsGoal
{
    public Guid Id { get; set; }

    public int Year { get; set; }

    /// <summary>Calendar month, 1–12.</summary>
    public int Month { get; set; }

    /// <summary>Target amount to save this month; always ≥ 0.</summary>
    public decimal Amount { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
