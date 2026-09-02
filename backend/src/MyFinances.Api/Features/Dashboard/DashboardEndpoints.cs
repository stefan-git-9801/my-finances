using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MyFinances.Api.Balances;
using MyFinances.Api.Recurring;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Dashboard;

public record DashboardAccount(Guid Id, string Name, AccountType Type, decimal CurrentBalance);

public record DashboardResponse(
    decimal NetWorth,
    decimal MonthIncome,
    decimal MonthExpense,
    decimal? SavingsRate,
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

        var monthly = await db.Transactions
            .Where(t => t.BookedOn >= monthStart && t.BookedOn < monthEnd)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        var income = monthly.FirstOrDefault(m => m.Type == TransactionType.Income)?.Sum ?? 0m;
        var expense = monthly.FirstOrDefault(m => m.Type == TransactionType.Expense)?.Sum ?? 0m;
        decimal? savingsRate = income > 0 ? (income - expense) / income : null;

        var byId = await balances.GetBalancesAsync(ct);
        var accounts = await db.Accounts.OrderBy(a => a.Name).ToListAsync(ct);

        var response = new DashboardResponse(
            NetWorth: byId.Values.Sum(),
            MonthIncome: income,
            MonthExpense: expense,
            SavingsRate: savingsRate,
            Accounts: accounts
                .Select(a => new DashboardAccount(a.Id, a.Name, a.Type, byId.GetValueOrDefault(a.Id, a.StartingBalance)))
                .ToList());

        return TypedResults.Ok(response);
    }
}
