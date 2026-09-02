using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Transfers;

public static class TransfersEndpoints
{
    public static RouteGroupBuilder MapTransfersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transfers")
            .WithTags("Transfers")
            .RequireAuthorization();

        group.MapGet("/", GetAll).WithName("GetTransfers");
        group.MapGet("/{id:guid}", GetById).WithName("GetTransfer");
        group.MapPost("/", Create).WithName("CreateTransfer");
        group.MapPut("/{id:guid}", Update).WithName("UpdateTransfer");
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteTransfer");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<TransferResponse>>> GetAll(
        AppDbContext db, CancellationToken ct,
        DateOnly? from = null, DateOnly? to = null, Guid? accountId = null)
    {
        var query = db.Transfers.AsQueryable();

        if (from is { } f)
            query = query.Where(t => t.BookedOn >= f);
        if (to is { } tt)
            query = query.Where(t => t.BookedOn <= tt);
        if (accountId is { } a)
            query = query.Where(t => t.FromAccountId == a || t.ToAccountId == a);

        var transfers = await query
            .OrderByDescending(t => t.BookedOn)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => t.ToResponse())
            .ToListAsync(ct);

        return TypedResults.Ok<IReadOnlyList<TransferResponse>>(transfers);
    }

    private static async Task<Results<Ok<TransferResponse>, NotFound>> GetById(
        Guid id, AppDbContext db, CancellationToken ct)
    {
        var transfer = await db.Transfers.FirstOrDefaultAsync(t => t.Id == id, ct);
        return transfer is null ? TypedResults.NotFound() : TypedResults.Ok(transfer.ToResponse());
    }

    private static async Task<Results<Created<TransferResponse>, ValidationProblem>> Create(
        CreateTransferRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        if (await Validate(db, request.FromAccountId, request.ToAccountId, ct) is { } problem)
            return problem;

        var transfer = new Transfer
        {
            Id = Guid.NewGuid(),
            FromAccountId = request.FromAccountId,
            ToAccountId = request.ToAccountId,
            Amount = request.Amount,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            BookedOn = request.BookedOn,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Transfers.Add(transfer);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/transfers/{transfer.Id}", transfer.ToResponse());
    }

    private static async Task<Results<Ok<TransferResponse>, NotFound, ValidationProblem>> Update(
        Guid id, UpdateTransferRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var transfer = await db.Transfers.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (transfer is null)
            return TypedResults.NotFound();

        if (await Validate(db, request.FromAccountId, request.ToAccountId, ct) is { } problem)
            return problem;

        transfer.FromAccountId = request.FromAccountId;
        transfer.ToAccountId = request.ToAccountId;
        transfer.Amount = request.Amount;
        transfer.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        transfer.BookedOn = request.BookedOn;
        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(transfer.ToResponse());
    }

    private static async Task<Results<NoContent, NotFound>> Delete(Guid id, AppDbContext db, CancellationToken ct)
    {
        var transfer = await db.Transfers.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (transfer is null)
            return TypedResults.NotFound();

        db.Transfers.Remove(transfer);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    private static async Task<ValidationProblem?> Validate(
        AppDbContext db, Guid fromAccountId, Guid toAccountId, CancellationToken ct)
    {
        var problems = new Dictionary<string, string[]>();

        if (fromAccountId == toAccountId)
            problems["toAccountId"] = ["Quell- und Zielkonto müssen unterschiedlich sein."];
        if (!await db.Accounts.AnyAsync(a => a.Id == fromAccountId, ct))
            problems["fromAccountId"] = ["Das Quellkonto existiert nicht."];
        if (!await db.Accounts.AnyAsync(a => a.Id == toAccountId, ct))
            problems["toAccountId"] = ["Das Zielkonto existiert nicht."];

        return problems.Count > 0 ? TypedResults.ValidationProblem(problems) : null;
    }
}
