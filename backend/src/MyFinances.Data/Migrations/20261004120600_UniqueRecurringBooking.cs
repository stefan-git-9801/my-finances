using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyFinances.Data.Migrations
{
    /// <inheritdoc />
    public partial class UniqueRecurringBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Safety net: drop leftover duplicate bookings (same template + date), keeping one,
            // otherwise the unique index cannot be created.
            migrationBuilder.Sql(@"
                DELETE FROM ""Transactions"" a
                USING ""Transactions"" b
                WHERE a.""RecurringTemplateId"" IS NOT NULL
                  AND a.""RecurringTemplateId"" = b.""RecurringTemplateId""
                  AND a.""BookedOn"" = b.""BookedOn""
                  AND a.ctid > b.ctid;");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_RecurringTemplateId_BookedOn",
                table: "Transactions");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_RecurringTemplateId_BookedOn",
                table: "Transactions",
                columns: new[] { "RecurringTemplateId", "BookedOn" },
                unique: true,
                filter: "\"RecurringTemplateId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_RecurringTemplateId_BookedOn",
                table: "Transactions");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_RecurringTemplateId_BookedOn",
                table: "Transactions",
                columns: new[] { "RecurringTemplateId", "BookedOn" });
        }
    }
}
