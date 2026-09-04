using MyFinances.Data.Reports;

namespace MyFinances.Data.Tests;

public class BudgetPeriodTests
{
    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    [Fact]
    public void SingleMonthCountsAsOne()
    {
        Assert.Equal(1, BudgetPeriod.MonthsInclusive(D(2026, 3, 1), D(2026, 3, 31)));
    }

    [Fact]
    public void SameDayCountsAsOne()
    {
        Assert.Equal(1, BudgetPeriod.MonthsInclusive(D(2026, 3, 15), D(2026, 3, 15)));
    }

    [Fact]
    public void PartlyCoveredMonthsStillCount()
    {
        // 28 Feb – 2 Mar touches two calendar months
        Assert.Equal(2, BudgetPeriod.MonthsInclusive(D(2026, 2, 28), D(2026, 3, 2)));
    }

    [Fact]
    public void CountsAcrossAYearBoundary()
    {
        Assert.Equal(3, BudgetPeriod.MonthsInclusive(D(2025, 11, 10), D(2026, 1, 5)));
    }

    [Fact]
    public void YearToDate()
    {
        Assert.Equal(9, BudgetPeriod.MonthsInclusive(D(2026, 1, 1), D(2026, 9, 4)));
    }

    [Fact]
    public void ArgumentOrderDoesNotMatter()
    {
        Assert.Equal(3, BudgetPeriod.MonthsInclusive(D(2026, 1, 5), D(2025, 11, 10)));
    }
}
