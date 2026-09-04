namespace MyFinances.Data.Reports;

/// <summary>
/// Pure date maths for the budget report. A category's <c>MonthlyBudget</c> applies to every month,
/// so comparing it against the spending in a multi-month period means scaling it by the number of
/// calendar months the period touches. No database access, so it can be unit tested in isolation.
/// </summary>
public static class BudgetPeriod
{
    /// <summary>
    /// The number of calendar months touched by the inclusive range <paramref name="from"/>–<paramref name="to"/>,
    /// counting a partly-covered month as a whole one. Always at least 1; the arguments may be in
    /// either order.
    /// </summary>
    public static int MonthsInclusive(DateOnly from, DateOnly to)
    {
        if (from > to)
            (from, to) = (to, from);

        var months = ((to.Year - from.Year) * 12) + (to.Month - from.Month) + 1;
        return Math.Max(months, 1);
    }
}
