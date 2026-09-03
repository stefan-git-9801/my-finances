using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MyFinances.Api.Balances;
using MyFinances.Api.Recurring;
using MyFinances.Data;
using MyFinances.Data.Entities;
using MyFinances.Data.Recurring;

namespace MyFinances.Api.Features.Dashboard;

public record DashboardAccount(Guid Id, string Name, AccountType Type, decimal CurrentBalance);

/// <summary>
/// "Wie viel kann ich diesen Monat noch täglich ausgeben?" – Einnahmen minus Ausgaben (beide
/// inklusive der für den Restmonat fälligen aktiven Vorlagen) minus Sparziel, geteilt durch die
/// verbleibenden Tage ab morgen.
/// </summary>
public record DashboardDailyBudget(
    decimal? SavingsGoal,
    decimal PlannedIncome,
    decimal PlannedExpense,
    decimal Available,
    int DaysRemaining,
    decimal? PerDay);

public record DashboardResponse(
    decimal NetWorth,
    decimal MonthIncome,
    decimal MonthExpense,
    decimal? SavingsRate,
    DashboardDailyBudget DailyBudget,
    IReadOnlyList<DashboardAccount> Accounts);

public static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard")
            .WithTags("Dashboard")
            .RequireAuthorization()
            .AddEndpointFilter<RecurringMaterializationFilter>();

        group.MapGet("/", Get).WithName("GetDashboard");

        return group;
    }

    private static async Task<Ok<DashboardResponse>> Get(
        AppDbContext db, BalanceService balances, TimeProvider clock, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1);
        var lastDayOfMonth = monthEnd.AddDays(-1);

        var monthly = await db.Transactions
            .Where(t => t.BookedOn >= monthStart && t.BookedOn < monthEnd)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        var income = monthly.FirstOrDefault(m => m.Type == TransactionType.Income)?.Sum ?? 0m;
        var expense = monthly.FirstOrDefault(m => m.Type == TransactionType.Expense)?.Sum ?? 0m;
        decimal? savingsRate = income > 0 ? (income - expense) / income : null;

        var dailyBudget = await BuildDailyBudgetAsync(db, today, monthStart, monthEnd, lastDayOfMonth, income, expense, ct);

        var byId = await balances.GetBalancesAsync(ct);
        var accounts = await db.Accounts.OrderBy(a => a.Name).ToListAsync(ct);

        var response = new DashboardResponse(
            NetWorth: byId.Values.Sum(),
            MonthIncome: income,
            MonthExpense: expense,
            SavingsRate: savingsRate,
            DailyBudget: dailyBudget,
            Accounts: accounts
                .Select(a => new DashboardAccount(a.Id, a.Name, a.Type, byId.GetValueOrDefault(a.Id, a.StartingBalance)))
                .ToList());

        return TypedResults.Ok(response);
    }

    private static async Task<DashboardDailyBudget> BuildDailyBudgetAsync(
        AppDbContext db, DateOnly today, DateOnly monthStart, DateOnly monthEnd, DateOnly lastDayOfMonth,
        decimal income, decimal expense, CancellationToken ct)
    {
        var savingsGoal = await db.MonthlySavingsGoals
            .Where(g => g.Year == today.Year && g.Month == today.Month)
            .Select(g => (decimal?)g.Amount)
            .FirstOrDefaultAsync(ct);

        var templates = await db.RecurringTemplates
            .Where(t => t.IsActive)
            .Select(t => new { t.Id, t.Type, t.Amount, t.DayOfMonth, t.StartDate, t.EndDate })
            .ToListAsync(ct);

        // Templates that already produced a booking this month (materialised or entered by hand).
        // A monthly template fires at most once per month, so any existing booking means the
        // occurrence is already reflected in income/expense – don't add it again as "planned",
        // even if the template's DayOfMonth was edited since.
        var templatesBookedThisMonth = (await db.Transactions
            .Where(t => t.RecurringTemplateId != null && t.BookedOn >= monthStart && t.BookedOn < monthEnd)
            .Select(t => t.RecurringTemplateId!.Value)
            .ToListAsync(ct)).ToHashSet();

        decimal plannedIncome = 0m;
        decimal plannedExpense = 0m;
        foreach (var t in templates)
        {
            if (templatesBookedThisMonth.Contains(t.Id))
                continue;
            var occurrence = RecurringSchedule.OccurrenceInMonth(t.StartDate, t.EndDate, t.DayOfMonth, today.Year, today.Month);
            if (occurrence is not { } date)
                continue;
            if (date <= today)          // due on or before today -> the materialiser has already booked it
                continue;

            if (t.Type == TransactionType.Income)
                plannedIncome += t.Amount;
            else
                plannedExpense += t.Amount;
        }

        var available = (income + plannedIncome) - (expense + plannedExpense) - (savingsGoal ?? 0m);
        var daysRemaining = lastDayOfMonth.Day - today.Day;
        decimal? perDay = daysRemaining > 0 ? available / daysRemaining : null;

        return new DashboardDailyBudget(savingsGoal, plannedIncome, plannedExpense, available, daysRemaining, perDay);
    }
}
