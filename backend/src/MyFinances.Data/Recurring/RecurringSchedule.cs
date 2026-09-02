namespace MyFinances.Data.Recurring;

/// <summary>
/// Pure date maths for monthly recurring templates. No database access, so it can be unit tested
/// in isolation. The API's materialiser turns these dates into real bookings.
/// </summary>
public static class RecurringSchedule
{
    /// <summary>
    /// The booking dates that are due but not yet materialised, one per month, in ascending order.
    /// </summary>
    /// <param name="startDate">First month the template applies (day component ignored).</param>
    /// <param name="endDate">Optional last month the template applies (day component ignored).</param>
    /// <param name="dayOfMonth">Desired day of month (1–31), clamped to the month's length.</param>
    /// <param name="lastMaterializedOn">Booking date of the last occurrence already created, if any.</param>
    /// <param name="asOf">Upper bound – usually "today". Occurrences after this are not yet due.</param>
    public static IEnumerable<DateOnly> DueBookingDates(
        DateOnly startDate,
        DateOnly? endDate,
        int dayOfMonth,
        DateOnly? lastMaterializedOn,
        DateOnly asOf)
    {
        if (dayOfMonth is < 1 or > 31)
            yield break;

        // Start from the month after the last materialised occurrence, otherwise from the start month.
        var cursor = lastMaterializedOn is { } last
            ? FirstOfMonth(last).AddMonths(1)
            : FirstOfMonth(startDate);

        var startMonth = FirstOfMonth(startDate);
        if (cursor < startMonth)
            cursor = startMonth;

        var lastMonth = endDate is { } end ? FirstOfMonth(end) : FirstOfMonth(asOf);
        var asOfMonth = FirstOfMonth(asOf);
        if (lastMonth > asOfMonth)
            lastMonth = asOfMonth;

        while (cursor <= lastMonth)
        {
            var day = Math.Min(dayOfMonth, DateTime.DaysInMonth(cursor.Year, cursor.Month));
            var occurrence = new DateOnly(cursor.Year, cursor.Month, day);

            if (occurrence <= asOf && (endDate is null || occurrence <= endDate))
                yield return occurrence;

            cursor = cursor.AddMonths(1);
        }
    }

    private static DateOnly FirstOfMonth(DateOnly date) => new(date.Year, date.Month, 1);
}
