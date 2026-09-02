using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Transactions;

public record TransactionResponse(
    Guid Id,
    Guid AccountId,
    Guid CategoryId,
    TransactionType Type,
    decimal Amount,
    string? Note,
    DateOnly BookedOn,
    Guid? RecurringTemplateId,
    DateTimeOffset CreatedAt);

public record CreateTransactionRequest(
    [property: Required] Guid AccountId,
    [property: Required] Guid CategoryId,
    TransactionType Type,
    [property: Range(0.01, 999_999_999)] decimal Amount,
    [property: MaxLength(200)] string? Note,
    [property: Required] DateOnly BookedOn);

public record UpdateTransactionRequest(
    [property: Required] Guid AccountId,
    [property: Required] Guid CategoryId,
    TransactionType Type,
    [property: Range(0.01, 999_999_999)] decimal Amount,
    [property: MaxLength(200)] string? Note,
    [property: Required] DateOnly BookedOn);

public static class TransactionMapping
{
    public static TransactionResponse ToResponse(this Transaction t) =>
        new(t.Id, t.AccountId, t.CategoryId, t.Type, t.Amount, t.Note, t.BookedOn, t.RecurringTemplateId, t.CreatedAt);
}
