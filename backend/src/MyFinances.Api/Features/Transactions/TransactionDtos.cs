using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Transactions;

public record TransactionResponse(
    Guid Id,
    Guid AccountId,
    decimal Amount,
    string Description,
    DateOnly BookedOn,
    DateTimeOffset CreatedAt);

public record CreateTransactionRequest(
    [property: Required] Guid AccountId,
    decimal Amount,
    [property: Required, MaxLength(200)] string Description,
    [property: Required] DateOnly BookedOn);

public record UpdateTransactionRequest(
    decimal Amount,
    [property: Required, MaxLength(200)] string Description,
    [property: Required] DateOnly BookedOn);

public static class TransactionMapping
{
    public static TransactionResponse ToResponse(this Transaction t) =>
        new(t.Id, t.AccountId, t.Amount, t.Description, t.BookedOn, t.CreatedAt);
}
