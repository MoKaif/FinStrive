using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace api.Migrations.FinanceDb
{
    /// <inheritdoc />
    public partial class AddTransactionHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TransactionHistoryImports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StatementDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Period = table.Column<string>(type: "text", nullable: true),
                    InvestorName = table.Column<string>(type: "text", nullable: true),
                    SourceFileName = table.Column<string>(type: "text", nullable: false),
                    StoredFileName = table.Column<string>(type: "text", nullable: true),
                    FileHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TransactionCount = table.Column<int>(type: "integer", nullable: false),
                    FirstTxnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastTxnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotalInvested = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    TotalDividends = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    ParseWarnings = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionHistoryImports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InvestmentTransactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportId = table.Column<int>(type: "integer", nullable: false),
                    AssetClass = table.Column<int>(type: "integer", nullable: false),
                    RowOrder = table.Column<int>(type: "integer", nullable: false),
                    TxnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InstrumentName = table.Column<string>(type: "text", nullable: false),
                    Isin = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: true),
                    Account = table.Column<string>(type: "text", nullable: true),
                    TransactionType = table.Column<string>(type: "text", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    Brokerage = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    BalanceQuantity = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    MarketValue = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    BalanceAmount = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    GroupKey = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvestmentTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvestmentTransactions_TransactionHistoryImports_ImportId",
                        column: x => x.ImportId,
                        principalTable: "TransactionHistoryImports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InvestmentTransactions_ImportId",
                table: "InvestmentTransactions",
                column: "ImportId");

            migrationBuilder.CreateIndex(
                name: "IX_InvestmentTransactions_ImportId_TxnDate",
                table: "InvestmentTransactions",
                columns: new[] { "ImportId", "TxnDate" });

            migrationBuilder.CreateIndex(
                name: "IX_InvestmentTransactions_Isin",
                table: "InvestmentTransactions",
                column: "Isin");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionHistoryImports_FileHash",
                table: "TransactionHistoryImports",
                column: "FileHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransactionHistoryImports_StatementDate",
                table: "TransactionHistoryImports",
                column: "StatementDate",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvestmentTransactions");

            migrationBuilder.DropTable(
                name: "TransactionHistoryImports");
        }
    }
}
