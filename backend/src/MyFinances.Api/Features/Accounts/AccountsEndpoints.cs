using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
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

    private static async Task<Ok<IReadOnlyList<AccountResponse>>> GetAll(AppDbContext db, CancellationToken ct)
    {
        var accounts = await db.Accounts
            .OrderBy(a => a.Name)
            .Select(a => a.ToResponse())
            .ToListAsync(ct);

        return TypedResults.Ok<IReadOnlyList<AccountResponse>>(accounts);
    }

    private static async Task<Results<Ok<AccountResponse>, NotFound>> GetById(
        Guid id, AppDbContext db, CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        return account is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(account.ToResponse());
    }

    private static async Task<Results<Created<AccountResponse>, ValidationProblem>> Create(
        CreateAccountRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Currency = request.Currency.ToUpperInvariant(),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/accounts/{account.Id}", account.ToResponse());
    }

    private static async Task<Results<Ok<AccountResponse>, NotFound, ValidationProblem>> Update(
        Guid id, UpdateAccountRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null)
            return TypedResults.NotFound();

        account.Name = request.Name;
        account.Currency = request.Currency.ToUpperInvariant();
        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(account.ToResponse());
    }

    private static async Task<Results<NoContent, NotFound>> Delete(Guid id, AppDbContext db, CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null)
            return TypedResults.NotFound();

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }
}
