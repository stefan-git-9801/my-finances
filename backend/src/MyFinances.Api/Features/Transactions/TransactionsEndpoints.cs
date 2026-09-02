using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Transactions;

public static class TransactionsEndpoints
{
    public static RouteGroupBuilder MapTransactionsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transactions")
            .WithTags("Transactions")
            .RequireAuthorization();

        group.MapGet("/", GetAll).WithName("GetTransactions");
        group.MapGet("/{id:guid}", GetById).WithName("GetTransaction");
        group.MapPost("/", Create).WithName("CreateTransaction");
        group.MapPut("/{id:guid}", Update).WithName("UpdateTransaction");
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteTransaction");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<TransactionResponse>>> GetAll(
        AppDbContext db, CancellationToken ct, Guid? accountId = null)
    {
        var query = db.Transactions.AsQueryable();
        if (accountId is { } id)
            query = query.Where(t => t.AccountId == id);

        var transactions = await query
            .OrderByDescending(t => t.BookedOn)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => t.ToResponse())
            .ToListAsync(ct);

        return TypedResults.Ok<IReadOnlyList<TransactionResponse>>(transactions);
    }

    private static async Task<Results<Ok<TransactionResponse>, NotFound>> GetById(
        Guid id, AppDbContext db, CancellationToken ct)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id, ct);
        return transaction is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(transaction.ToResponse());
    }

    private static async Task<Results<Created<TransactionResponse>, ValidationProblem>> Create(
        CreateTransactionRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var accountExists = await db.Accounts.AnyAsync(a => a.Id == request.AccountId, ct);
        if (accountExists is false)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.AccountId)] = ["Account does not exist."],
            });
        }

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            AccountId = request.AccountId,
            Amount = request.Amount,
            Description = request.Description,
            BookedOn = request.BookedOn,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Transactions.Add(transaction);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/transactions/{transaction.Id}", transaction.ToResponse());
    }

    private static async Task<Results<Ok<TransactionResponse>, NotFound, ValidationProblem>> Update(
        Guid id, UpdateTransactionRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (transaction is null)
            return TypedResults.NotFound();

        transaction.Amount = request.Amount;
        transaction.Description = request.Description;
        transaction.BookedOn = request.BookedOn;
        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(transaction.ToResponse());
    }

    private static async Task<Results<NoContent, NotFound>> Delete(Guid id, AppDbContext db, CancellationToken ct)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (transaction is null)
            return TypedResults.NotFound();

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }
}
