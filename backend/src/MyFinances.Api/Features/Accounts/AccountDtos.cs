using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Accounts;

public record AccountResponse(Guid Id, string Name, string Currency, DateTimeOffset CreatedAt);

public record CreateAccountRequest(
    [property: Required, MaxLength(100)] string Name,
    [property: Required, MinLength(3), MaxLength(3)] string Currency);

public record UpdateAccountRequest(
    [property: Required, MaxLength(100)] string Name,
    [property: Required, MinLength(3), MaxLength(3)] string Currency);

public static class AccountMapping
{
    public static AccountResponse ToResponse(this Account a) =>
        new(a.Id, a.Name, a.Currency, a.CreatedAt);
}
