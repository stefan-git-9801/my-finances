using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MyFinances.Data.Auth;
using MyFinances.Data.Entities;

namespace MyFinances.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Transfer> Transfers => Set<Transfer>();
    public DbSet<RecurringTemplate> RecurringTemplates => Set<RecurringTemplate>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Account>(e =>
        {
            e.Property(a => a.Name).HasMaxLength(100);
            e.Property(a => a.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(a => a.StartingBalance).HasPrecision(18, 2);
        });

        builder.Entity<Category>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(100);
            e.Property(c => c.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(c => c.MonthlyBudget).HasPrecision(18, 2);
            e.HasIndex(c => c.Name).IsUnique();
        });

        builder.Entity<Transaction>(e =>
        {
            e.Property(t => t.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(t => t.Amount).HasPrecision(18, 2);
            e.Property(t => t.Note).HasMaxLength(200);

            e.HasOne(t => t.Account)
                .WithMany(a => a.Transactions)
                .HasForeignKey(t => t.AccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.Category)
                .WithMany(c => c.Transactions)
                .HasForeignKey(t => t.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.RecurringTemplate)
                .WithMany(r => r.GeneratedTransactions)
                .HasForeignKey(t => t.RecurringTemplateId)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasIndex(t => t.AccountId);
            e.HasIndex(t => t.CategoryId);
            e.HasIndex(t => t.BookedOn);
            e.HasIndex(t => new { t.RecurringTemplateId, t.BookedOn });
        });

        builder.Entity<Transfer>(e =>
        {
            e.Property(t => t.Amount).HasPrecision(18, 2);
            e.Property(t => t.Note).HasMaxLength(200);

            e.HasOne(t => t.FromAccount)
                .WithMany(a => a.TransfersFrom)
                .HasForeignKey(t => t.FromAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.ToAccount)
                .WithMany(a => a.TransfersTo)
                .HasForeignKey(t => t.ToAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(t => t.FromAccountId);
            e.HasIndex(t => t.ToAccountId);
            e.HasIndex(t => t.BookedOn);
        });

        builder.Entity<RecurringTemplate>(e =>
        {
            e.Property(r => r.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(r => r.Amount).HasPrecision(18, 2);
            e.Property(r => r.Note).HasMaxLength(200);

            e.HasOne(r => r.Account)
                .WithMany()
                .HasForeignKey(r => r.AccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Category)
                .WithMany()
                .HasForeignKey(r => r.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
