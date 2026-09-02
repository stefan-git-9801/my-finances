using Microsoft.EntityFrameworkCore;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Balances;

/// <summary>
/// Derives current account balances from the starting balance plus every income, expense and transfer.
/// Computes all accounts in a handful of grouped queries rather than one query per account.
/// </summary>
public sealed class BalanceService(AppDbContext db)
{
    /// <summary>Current balance for every account, keyed by account id.</summary>
    public async Task<Dictionary<Guid, decimal>> GetBalancesAsync(CancellationToken ct = default)
    {
        var starting = await db.Accounts
            .Select(a => new { a.Id, a.StartingBalance })
            .ToListAsync(ct);

        var byType = await db.Transactions
            .GroupBy(t => new { t.AccountId, t.Type })
            .Select(g => new { g.Key.AccountId, g.Key.Type, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        var transfersOut = await db.Transfers
            .GroupBy(t => t.FromAccountId)
            .Select(g => new { AccountId = g.Key, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        var transfersIn = await db.Transfers
            .GroupBy(t => t.ToAccountId)
            .Select(g => new { AccountId = g.Key, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        var balances = starting.ToDictionary(a => a.Id, a => a.StartingBalance);

        foreach (var row in byType)
        {
            if (!balances.ContainsKey(row.AccountId))
                continue;
            balances[row.AccountId] += row.Type == TransactionType.Income ? row.Sum : -row.Sum;
        }

        foreach (var row in transfersIn)
            if (balances.ContainsKey(row.AccountId))
                balances[row.AccountId] += row.Sum;

        foreach (var row in transfersOut)
            if (balances.ContainsKey(row.AccountId))
                balances[row.AccountId] -= row.Sum;

        return balances;
    }

    /// <summary>Sum of all account balances.</summary>
    public async Task<decimal> GetNetWorthAsync(CancellationToken ct = default)
    {
        var balances = await GetBalancesAsync(ct);
        return balances.Values.Sum();
    }
}
