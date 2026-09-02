using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
using MyFinances.Api.Balances;
using MyFinances.Api.Common;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Accounts;

public static class AccountsEndpoints
{
    public static RouteGroupBuilder MapAccountsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounts")
            .WithTags("Accounts")
            .RequireAuthorization();

        group.MapGet("/", GetAll).WithName("GetAccounts");
        group.MapGet("/{id:guid}", GetById).WithName("GetAccount");
        group.MapPost("/", Create).WithName("CreateAccount");
        group.MapPut("/{id:guid}", Update).WithName("UpdateAccount");
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteAccount");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<AccountResponse>>> GetAll(
        AppDbContext db, BalanceService balances, CancellationToken ct)
    {
        var accounts = await db.Accounts.OrderBy(a => a.Name).ToListAsync(ct);
        var byId = await balances.GetBalancesAsync(ct);

        var response = accounts
            .Select(a => a.ToResponse(byId.GetValueOrDefault(a.Id, a.StartingBalance)))
            .ToList();

        return TypedResults.Ok<IReadOnlyList<AccountResponse>>(response);
    }

    private static async Task<Results<Ok<AccountResponse>, NotFound>> GetById(
        Guid id, AppDbContext db, BalanceService balances, CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null)
            return TypedResults.NotFound();

        var byId = await balances.GetBalancesAsync(ct);
        return TypedResults.Ok(account.ToResponse(byId.GetValueOrDefault(id, account.StartingBalance)));
    }

    private static async Task<Results<Created<AccountResponse>, ValidationProblem>> Create(
        CreateAccountRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Type = request.Type,
            StartingBalance = request.StartingBalance,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/accounts/{account.Id}", account.ToResponse(account.StartingBalance));
    }

    private static async Task<Results<Ok<AccountResponse>, NotFound, ValidationProblem>> Update(
        Guid id, UpdateAccountRequest request, AppDbContext db, BalanceService balances, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null)
            return TypedResults.NotFound();

        account.Name = request.Name.Trim();
        account.Type = request.Type;
        account.StartingBalance = request.StartingBalance;
        await db.SaveChangesAsync(ct);

        var byId = await balances.GetBalancesAsync(ct);
        return TypedResults.Ok(account.ToResponse(byId.GetValueOrDefault(id, account.StartingBalance)));
    }

    private static async Task<Results<NoContent, NotFound, Conflict<ErrorResponse>>> Delete(
        Guid id, AppDbContext db, CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null)
            return TypedResults.NotFound();

        var referenced =
            await db.Transactions.AnyAsync(t => t.AccountId == id, ct) ||
            await db.Transfers.AnyAsync(t => t.FromAccountId == id || t.ToAccountId == id, ct) ||
            await db.RecurringTemplates.AnyAsync(r => r.AccountId == id, ct);

        if (referenced)
            return TypedResults.Conflict(new ErrorResponse(
                "Das Konto hat noch Buchungen, Umbuchungen oder Vorlagen und kann nicht gelöscht werden."));

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }
}
