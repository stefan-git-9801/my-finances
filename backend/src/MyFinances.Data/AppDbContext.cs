using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MyFinances.Data.Auth;
using MyFinances.Data.Entities;

namespace MyFinances.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Account>(e =>
        {
            e.Property(a => a.Name).HasMaxLength(100);
            e.Property(a => a.Currency).HasMaxLength(3);
        });

        builder.Entity<Transaction>(e =>
        {
            e.Property(t => t.Description).HasMaxLength(200);
            e.Property(t => t.Amount).HasPrecision(18, 2);

            e.HasOne(t => t.Account)
                .WithMany(a => a.Transactions)
                .HasForeignKey(t => t.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(t => t.AccountId);
        });
    }
}
