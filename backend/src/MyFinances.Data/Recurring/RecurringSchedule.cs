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

    /// <summary>
    /// The single booking date a template would produce in the given calendar month, or <c>null</c>
    /// if the template does not apply that month. Start is matched by month (the day component of
    /// <paramref name="startDate"/> is ignored), end by exact date, and the day is clamped to the
    /// month's length – the same rules <see cref="DueBookingDates"/> uses, so the dashboard's
    /// "planned" figure lines up with what the materialiser will actually book.
    /// </summary>
    /// <param name="startDate">First month the template applies (day component ignored).</param>
    /// <param name="endDate">Optional last day the template applies.</param>
    /// <param name="dayOfMonth">Desired day of month (1–31), clamped to the month's length.</param>
    /// <param name="year">Calendar year of the month to look at.</param>
    /// <param name="month">Calendar month (1–12) to look at.</param>
    public static DateOnly? OccurrenceInMonth(
        DateOnly startDate, DateOnly? endDate, int dayOfMonth, int year, int month)
    {
        if (dayOfMonth is < 1 or > 31)
            return null;

        var target = new DateOnly(year, month, 1);
        if (target < FirstOfMonth(startDate))
            return null;
        if (endDate is { } end && target > FirstOfMonth(end))
            return null;

        var day = Math.Min(dayOfMonth, DateTime.DaysInMonth(year, month));
        var occurrence = new DateOnly(year, month, day);

        if (endDate is { } e && occurrence > e)
            return null;

        return occurrence;
    }

    private static DateOnly FirstOfMonth(DateOnly date) => new(date.Year, date.Month, 1);
}
