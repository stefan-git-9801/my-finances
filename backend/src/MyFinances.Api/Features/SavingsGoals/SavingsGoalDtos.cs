using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.SavingsGoals;

/// <summary><see cref="Amount"/> is <c>null</c> when no goal is set for that month.</summary>
public record SavingsGoalResponse(int Year, int Month, decimal? Amount);

public record UpsertSavingsGoalRequest(
    [property: Range(0, 9_999_999)] decimal Amount);

public static class SavingsGoalMapping
{
    public static SavingsGoalResponse ToResponse(this MonthlySavingsGoal g) =>
        new(g.Year, g.Month, g.Amount);
}
