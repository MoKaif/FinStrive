using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.FinanceDb
{
    /// <inheritdoc />
    public partial class AddUniqueSourceRefIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Source_SourceRef",
                table: "Transactions",
                columns: new[] { "Source", "SourceRef" },
                unique: true,
                filter: "\"Source\" = 'pdf' AND \"SourceRef\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_Source_SourceRef",
                table: "Transactions");
        }
    }
}
