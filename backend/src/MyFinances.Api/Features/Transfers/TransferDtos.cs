using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Transfers;

public record TransferResponse(
    Guid Id,
    Guid FromAccountId,
    Guid ToAccountId,
    decimal Amount,
    string? Note,
    DateOnly BookedOn,
    DateTimeOffset CreatedAt);

public record CreateTransferRequest(
    [property: Required] Guid FromAccountId,
    [property: Required] Guid ToAccountId,
    [property: Range(0.01, 999_999_999)] decimal Amount,
    [property: MaxLength(200)] string? Note,
    [property: Required] DateOnly BookedOn);

public record UpdateTransferRequest(
    [property: Required] Guid FromAccountId,
    [property: Required] Guid ToAccountId,
    [property: Range(0.01, 999_999_999)] decimal Amount,
    [property: MaxLength(200)] string? Note,
    [property: Required] DateOnly BookedOn);

public static class TransferMapping
{
    public static TransferResponse ToResponse(this Transfer t) =>
        new(t.Id, t.FromAccountId, t.ToAccountId, t.Amount, t.Note, t.BookedOn, t.CreatedAt);
}
