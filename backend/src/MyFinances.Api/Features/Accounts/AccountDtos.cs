using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Accounts;

public record AccountResponse(
    Guid Id,
    string Name,
    AccountType Type,
    decimal StartingBalance,
    decimal CurrentBalance,
    DateTimeOffset CreatedAt);

public record CreateAccountRequest(
    [property: Required, MaxLength(100)] string Name,
    AccountType Type,
    decimal StartingBalance);

public record UpdateAccountRequest(
    [property: Required, MaxLength(100)] string Name,
    AccountType Type,
    decimal StartingBalance);

public static class AccountMapping
{
    public static AccountResponse ToResponse(this Account a, decimal currentBalance) =>
        new(a.Id, a.Name, a.Type, a.StartingBalance, currentBalance, a.CreatedAt);
}
