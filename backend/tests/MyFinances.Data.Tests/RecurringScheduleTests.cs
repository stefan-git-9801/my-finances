using MyFinances.Data.Recurring;

namespace MyFinances.Data.Tests;

public class RecurringScheduleTests
{
    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    [Fact]
    public void GeneratesOneOccurrencePerMonthFromStartToAsOf()
    {
        var dates = RecurringSchedule.DueBookingDates(
            startDate: D(2026, 1, 15), endDate: null, dayOfMonth: 15,
            lastMaterializedOn: null, asOf: D(2026, 4, 1)).ToList();

        Assert.Equal(new[] { D(2026, 1, 15), D(2026, 2, 15), D(2026, 3, 15) }, dates);
    }

    [Fact]
    public void ClampsDayToShorterMonths()
    {
        var dates = RecurringSchedule.DueBookingDates(
            startDate: D(2026, 1, 31), endDate: null, dayOfMonth: 31,
            lastMaterializedOn: null, asOf: D(2026, 3, 31)).ToList();

        Assert.Equal(new[] { D(2026, 1, 31), D(2026, 2, 28), D(2026, 3, 31) }, dates);
    }

    [Fact]
    public void SkipsMonthsAlreadyMaterialised()
    {
        var dates = RecurringSchedule.DueBookingDates(
            startDate: D(2026, 1, 1), endDate: null, dayOfMonth: 1,
            lastMaterializedOn: D(2026, 2, 1), asOf: D(2026, 4, 10)).ToList();

        Assert.Equal(new[] { D(2026, 3, 1), D(2026, 4, 1) }, dates);
    }

    [Fact]
    public void StopsAtEndDate()
    {
        var dates = RecurringSchedule.DueBookingDates(
            startDate: D(2026, 1, 10), endDate: D(2026, 2, 28), dayOfMonth: 10,
            lastMaterializedOn: null, asOf: D(2026, 12, 1)).ToList();

        Assert.Equal(new[] { D(2026, 1, 10), D(2026, 2, 10) }, dates);
    }

    [Fact]
    public void ReturnsNothingWhenNotYetDue()
    {
        var dates = RecurringSchedule.DueBookingDates(
            startDate: D(2026, 6, 1), endDate: null, dayOfMonth: 1,
            lastMaterializedOn: null, asOf: D(2026, 3, 1)).ToList();

        Assert.Empty(dates);
    }

    [Fact]
    public void DoesNotReturnCurrentMonthOccurrenceBeforeItsDay()
    {
        var dates = RecurringSchedule.DueBookingDates(
            startDate: D(2026, 1, 20), endDate: null, dayOfMonth: 20,
            lastMaterializedOn: D(2026, 2, 20), asOf: D(2026, 3, 10)).ToList();

        Assert.Empty(dates);
    }

    [Fact]
    public void RejectsInvalidDayOfMonth()
    {
        Assert.Empty(RecurringSchedule.DueBookingDates(D(2026, 1, 1), null, 0, null, D(2026, 6, 1)));
        Assert.Empty(RecurringSchedule.DueBookingDates(D(2026, 1, 1), null, 32, null, D(2026, 6, 1)));
    }

    [Fact]
    public void OccurrenceInMonth_ReturnsClampedDayWithinWindow()
    {
        Assert.Equal(D(2026, 3, 15),
            RecurringSchedule.OccurrenceInMonth(D(2026, 1, 15), null, 15, 2026, 3));
        Assert.Equal(D(2026, 2, 28),
            RecurringSchedule.OccurrenceInMonth(D(2026, 1, 31), null, 31, 2026, 2));
    }

    [Fact]
    public void OccurrenceInMonth_NullOutsideStartEndWindow()
    {
        Assert.Null(RecurringSchedule.OccurrenceInMonth(D(2026, 6, 1), null, 10, 2026, 3));
        Assert.Null(RecurringSchedule.OccurrenceInMonth(D(2026, 1, 10), D(2026, 2, 28), 10, 2026, 3));
    }

    [Fact]
    public void OccurrenceInMonth_MatchesStartByMonthLikeDueBookingDates()
    {
        // start day (20th) is after the template day (10th) in the very first month:
        // DueBookingDates ignores the day component of StartDate, so this must too.
        Assert.Equal(D(2026, 1, 10),
            RecurringSchedule.OccurrenceInMonth(D(2026, 1, 20), null, 10, 2026, 1));
    }

    [Fact]
    public void OccurrenceInMonth_RespectsDayLevelEnd()
    {
        // ends on the 5th – the 10th of that same month is after the end
        Assert.Null(RecurringSchedule.OccurrenceInMonth(D(2026, 1, 1), D(2026, 3, 5), 10, 2026, 3));
        // ends on the 15th – the 10th still falls within the window
        Assert.Equal(D(2026, 3, 10),
            RecurringSchedule.OccurrenceInMonth(D(2026, 1, 1), D(2026, 3, 15), 10, 2026, 3));
    }

    [Fact]
    public void OccurrenceInMonth_RejectsInvalidDayOfMonth()
    {
        Assert.Null(RecurringSchedule.OccurrenceInMonth(D(2026, 1, 1), null, 0, 2026, 1));
        Assert.Null(RecurringSchedule.OccurrenceInMonth(D(2026, 1, 1), null, 32, 2026, 1));
    }
}
