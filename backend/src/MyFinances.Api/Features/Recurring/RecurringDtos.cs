using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Recurring;

public record RecurringTemplateResponse(
    Guid Id,
    Guid AccountId,
    Guid CategoryId,
    TransactionType Type,
    decimal Amount,
    string? Note,
    int DayOfMonth,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly? LastMaterializedOn,
    bool IsActive,
    DateTimeOffset CreatedAt);

public record CreateRecurringTemplateRequest(
    [property: Required] Guid AccountId,
    [property: Required] Guid CategoryId,
    TransactionType Type,
    [property: Range(0.01, 999_999_999)] decimal Amount,
    [property: MaxLength(200)] string? Note,
    [property: Range(1, 31)] int DayOfMonth,
    [property: Required] DateOnly StartDate,
    DateOnly? EndDate,
    bool IsActive);

public record UpdateRecurringTemplateRequest(
    [property: Required] Guid AccountId,
    [property: Required] Guid CategoryId,
    TransactionType Type,
    [property: Range(0.01, 999_999_999)] decimal Amount,
    [property: MaxLength(200)] string? Note,
    [property: Range(1, 31)] int DayOfMonth,
    [property: Required] DateOnly StartDate,
    DateOnly? EndDate,
    bool IsActive);

public static class RecurringTemplateMapping
{
    public static RecurringTemplateResponse ToResponse(this RecurringTemplate r) =>
        new(r.Id, r.AccountId, r.CategoryId, r.Type, r.Amount, r.Note, r.DayOfMonth,
            r.StartDate, r.EndDate, r.LastMaterializedOn, r.IsActive, r.CreatedAt);
}
