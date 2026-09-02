using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MyFinances.Api.Recurring;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Reports;

public record CategoryTotal(Guid CategoryId, string CategoryName, decimal Total);

public record CashflowPoint(int Year, int Month, decimal Income, decimal Expense);

public record BalancePoint(DateOnly Date, decimal Balance);

public static class ReportsEndpoints
{
    public static RouteGroupBuilder MapReportsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports")
            .WithTags("Reports")
            .RequireAuthorization()
            .AddEndpointFilter<RecurringMaterializationFilter>();

        group.MapGet("/expenses-by-category", ExpensesByCategory).WithName("GetExpensesByCategory");
        group.MapGet("/cashflow", Cashflow).WithName("GetCashflow");
        group.MapGet("/account-balances", AccountBalances).WithName("GetAccountBalanceSeries");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<CategoryTotal>>> ExpensesByCategory(
        AppDbContext db, CancellationToken ct, DateOnly? from = null, DateOnly? to = null)
    {
        var query = db.Transactions.Where(t => t.Type == TransactionType.Expense);
        if (from is { } f)
            query = query.Where(t => t.BookedOn >= f);
        if (to is { } tt)
            query = query.Where(t => t.BookedOn <= tt);

        var grouped = await query
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key, Total = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        var ids = grouped.Select(g => g.CategoryId).ToList();
        var names = await db.Categories
            .Where(c => ids.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var totals = grouped
            .Select(g => new CategoryTotal(g.CategoryId, names.GetValueOrDefault(g.CategoryId, "?"), g.Total))
            .OrderByDescending(c => c.Total)
            .ToList();

        return TypedResults.Ok<IReadOnlyList<CategoryTotal>>(totals);
    }

    private static async Task<Ok<IReadOnlyList<CashflowPoint>>> Cashflow(
        AppDbContext db, TimeProvider clock, CancellationToken ct, int months = 12)
    {
        months = Math.Clamp(months, 1, 60);
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(-(months - 1));

        var rows = await db.Transactions
            .Where(t => t.BookedOn >= firstMonth)
            .GroupBy(t => new { t.BookedOn.Year, t.BookedOn.Month, t.Type })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Type, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        var points = new List<CashflowPoint>(months);
        for (var i = 0; i < months; i++)
        {
            var m = firstMonth.AddMonths(i);
            var income = rows.FirstOrDefault(r => r.Year == m.Year && r.Month == m.Month && r.Type == TransactionType.Income)?.Sum ?? 0m;
            var expense = rows.FirstOrDefault(r => r.Year == m.Year && r.Month == m.Month && r.Type == TransactionType.Expense)?.Sum ?? 0m;
            points.Add(new CashflowPoint(m.Year, m.Month, income, expense));
        }

        return TypedResults.Ok<IReadOnlyList<CashflowPoint>>(points);
    }

    private static async Task<Results<Ok<IReadOnlyList<BalancePoint>>, NotFound>> AccountBalances(
        Guid accountId, AppDbContext db, TimeProvider clock, CancellationToken ct, int months = 12)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null)
            return TypedResults.NotFound();

        months = Math.Clamp(months, 1, 60);
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(-(months - 1));

        var movements = await db.Transactions
            .Where(t => t.AccountId == accountId)
            .Select(t => new { t.BookedOn, Delta = t.Type == TransactionType.Income ? t.Amount : -t.Amount })
            .ToListAsync(ct);

        var transfersIn = await db.Transfers
            .Where(t => t.ToAccountId == accountId)
            .Select(t => new { t.BookedOn, Delta = t.Amount })
            .ToListAsync(ct);

        var transfersOut = await db.Transfers
            .Where(t => t.FromAccountId == accountId)
            .Select(t => new { t.BookedOn, Delta = -t.Amount })
            .ToListAsync(ct);

        var all = movements.Concat(transfersIn).Concat(transfersOut).ToList();

        var points = new List<BalancePoint>(months);
        for (var i = 0; i < months; i++)
        {
            var monthEnd = firstMonth.AddMonths(i + 1).AddDays(-1);
            var balance = account.StartingBalance + all.Where(x => x.BookedOn <= monthEnd).Sum(x => x.Delta);
            points.Add(new BalancePoint(monthEnd, balance));
        }

        return TypedResults.Ok<IReadOnlyList<BalancePoint>>(points);
    }
}
