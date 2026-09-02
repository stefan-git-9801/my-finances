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
}
