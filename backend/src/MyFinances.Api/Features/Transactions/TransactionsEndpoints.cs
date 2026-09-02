using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
using MyFinances.Api.Recurring;
using MyFinances.Data;
using MyFinances.Data.Csv;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Transactions;

public static class TransactionsEndpoints
{
    public static RouteGroupBuilder MapTransactionsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transactions")
            .WithTags("Transactions")
            .RequireAuthorization()
            .AddEndpointFilter<RecurringMaterializationFilter>();

        group.MapGet("/", GetAll).WithName("GetTransactions");
        group.MapGet("/export", Export).WithName("ExportTransactions");
        group.MapGet("/{id:guid}", GetById).WithName("GetTransaction");
        group.MapPost("/", Create).WithName("CreateTransaction");
        group.MapPut("/{id:guid}", Update).WithName("UpdateTransaction");
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteTransaction");

        return group;
    }

    private static IQueryable<Transaction> Filter(
        IQueryable<Transaction> query,
        DateOnly? from, DateOnly? to, Guid? accountId, Guid? categoryId, TransactionType? type)
    {
        if (from is { } f)
            query = query.Where(t => t.BookedOn >= f);
        if (to is { } tt)
            query = query.Where(t => t.BookedOn <= tt);
        if (accountId is { } a)
            query = query.Where(t => t.AccountId == a);
        if (categoryId is { } c)
            query = query.Where(t => t.CategoryId == c);
        if (type is { } ty)
            query = query.Where(t => t.Type == ty);
        return query;
    }

    private static async Task<Ok<IReadOnlyList<TransactionResponse>>> GetAll(
        AppDbContext db, CancellationToken ct,
        DateOnly? from = null, DateOnly? to = null,
        Guid? accountId = null, Guid? categoryId = null, TransactionType? type = null)
    {
        var query = Filter(db.Transactions.AsQueryable(), from, to, accountId, categoryId, type);

        var transactions = await query
            .OrderByDescending(t => t.BookedOn)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => t.ToResponse())
            .ToListAsync(ct);

        return TypedResults.Ok<IReadOnlyList<TransactionResponse>>(transactions);
    }

    private static async Task<FileContentHttpResult> Export(
        AppDbContext db, CancellationToken ct,
        DateOnly? from = null, DateOnly? to = null,
        Guid? accountId = null, Guid? categoryId = null, TransactionType? type = null)
    {
        var query = Filter(db.Transactions.AsQueryable(), from, to, accountId, categoryId, type);

        var rows = await query
            .OrderBy(t => t.BookedOn).ThenBy(t => t.CreatedAt)
            .Select(t => new
            {
                t.BookedOn,
                Account = t.Account!.Name,
                Category = t.Category!.Name,
                t.Type,
                t.Amount,
                t.Note,
            })
            .ToListAsync(ct);

        var lines = new List<string> { CsvWriter.Row("Datum", "Konto", "Kategorie", "Typ", "Betrag", "Notiz") };
        lines.AddRange(rows.Select(r => CsvWriter.Row(
            CsvWriter.Date(r.BookedOn),
            r.Account,
            r.Category,
            r.Type == TransactionType.Income ? "Einnahme" : "Ausgabe",
            CsvWriter.Amount(r.Type == TransactionType.Income ? r.Amount : -r.Amount),
            r.Note ?? string.Empty)));

        var bytes = CsvWriter.ToFileBytes(lines);
        var fileName = $"buchungen-{DateOnly.FromDateTime(DateTime.UtcNow):yyyy-MM-dd}.csv";
        return TypedResults.File(bytes, "text/csv; charset=utf-8", fileName);
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

        if (await Validate(db, request.AccountId, request.CategoryId, ct) is { } problem)
            return problem;

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            AccountId = request.AccountId,
            CategoryId = request.CategoryId,
            Type = request.Type,
            Amount = request.Amount,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
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

        if (await Validate(db, request.AccountId, request.CategoryId, ct) is { } problem)
            return problem;

        transaction.AccountId = request.AccountId;
        transaction.CategoryId = request.CategoryId;
        transaction.Type = request.Type;
        transaction.Amount = request.Amount;
        transaction.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
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

    private static async Task<ValidationProblem?> Validate(
        AppDbContext db, Guid accountId, Guid categoryId, CancellationToken ct)
    {
        var problems = new Dictionary<string, string[]>();

        if (!await db.Accounts.AnyAsync(a => a.Id == accountId, ct))
            problems["accountId"] = ["Das Konto existiert nicht."];
        if (!await db.Categories.AnyAsync(c => c.Id == categoryId, ct))
            problems["categoryId"] = ["Die Kategorie existiert nicht."];

        return problems.Count > 0 ? TypedResults.ValidationProblem(problems) : null;
    }
}
