using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.SavingsGoals;

public static class SavingsGoalsEndpoints
{
    public static RouteGroupBuilder MapSavingsGoalsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/savings-goals")
            .WithTags("SavingsGoals")
            .RequireAuthorization();

        group.MapGet("/{year:int}/{month:int}", Get).WithName("GetSavingsGoal");
        group.MapPut("/{year:int}/{month:int}", Upsert).WithName("UpsertSavingsGoal");

        return group;
    }

    private static async Task<Results<Ok<SavingsGoalResponse>, ValidationProblem>> Get(
        int year, int month, AppDbContext db, CancellationToken ct)
    {
        if (MonthProblem(year, month) is { } problem)
            return problem;

        var goal = await db.MonthlySavingsGoals
            .FirstOrDefaultAsync(g => g.Year == year && g.Month == month, ct);

        return TypedResults.Ok(goal?.ToResponse() ?? new SavingsGoalResponse(year, month, null));
    }

    private static async Task<Results<Ok<SavingsGoalResponse>, ValidationProblem>> Upsert(
        int year, int month, UpsertSavingsGoalRequest request, AppDbContext db, TimeProvider clock,
        CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);
        if (MonthProblem(year, month) is { } problem)
            return problem;

        var goal = await db.MonthlySavingsGoals
            .FirstOrDefaultAsync(g => g.Year == year && g.Month == month, ct);

        // An amount of 0 means "no goal" – keep the table free of empty rows.
        if (request.Amount == 0m)
        {
            if (goal is not null)
                db.MonthlySavingsGoals.Remove(goal);
            await db.SaveChangesAsync(ct);
            return TypedResults.Ok(new SavingsGoalResponse(year, month, null));
        }

        if (goal is null)
        {
            goal = new MonthlySavingsGoal
            {
                Id = Guid.NewGuid(),
                Year = year,
                Month = month,
                CreatedAt = clock.GetUtcNow(),
            };
            db.MonthlySavingsGoals.Add(goal);
        }

        goal.Amount = request.Amount;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException) when (db.Entry(goal).State == EntityState.Added)
        {
            // A concurrent PUT for the same month won the race against the unique (Year, Month)
            // index – re-read its row and apply this amount on top.
            db.Entry(goal).State = EntityState.Detached;
            goal = await db.MonthlySavingsGoals
                .FirstAsync(g => g.Year == year && g.Month == month, ct);
            goal.Amount = request.Amount;
            await db.SaveChangesAsync(ct);
        }

        return TypedResults.Ok(goal.ToResponse());
    }

    private static ValidationProblem? MonthProblem(int year, int month)
    {
        var problems = new Dictionary<string, string[]>();

        if (month is < 1 or > 12)
            problems["month"] = ["Der Monat muss zwischen 1 und 12 liegen."];
        if (year is < 2000 or > 2100)
            problems["year"] = ["Das Jahr muss zwischen 2000 und 2100 liegen."];

        return problems.Count > 0 ? TypedResults.ValidationProblem(problems) : null;
    }
}
