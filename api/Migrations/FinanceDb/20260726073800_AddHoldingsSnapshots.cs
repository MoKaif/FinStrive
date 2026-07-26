using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace api.Migrations.FinanceDb
{
    /// <inheritdoc />
    public partial class AddHoldingsSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Transactions.ClosingBalance and .Skipped were added to the model but
            // never captured in a migration, so the diff that produced this file
            // picked them up. They already exist in deployed databases, hence the
            // conditional form: this applies cleanly both to a live database that
            // has them and to one created from scratch.
            migrationBuilder.Sql(
                "ALTER TABLE \"Transactions\" ADD COLUMN IF NOT EXISTS \"ClosingBalance\" numeric NULL;");
            migrationBuilder.Sql(
                "ALTER TABLE \"Transactions\" ADD COLUMN IF NOT EXISTS \"Skipped\" boolean NOT NULL DEFAULT FALSE;");

            migrationBuilder.CreateTable(
                name: "CostBasisOverrides",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Isin = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    InstrumentName = table.Column<string>(type: "text", nullable: true),
                    InvestedAmount = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostBasisOverrides", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HoldingsSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StatementDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InvestorName = table.Column<string>(type: "text", nullable: true),
                    SourceFileName = table.Column<string>(type: "text", nullable: false),
                    StoredFileName = table.Column<string>(type: "text", nullable: true),
                    FileHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReportedInvested = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    ReportedMarketValue = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    ReportedTotalReturn = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    ReportedReturnPct = table.Column<decimal>(type: "numeric(9,4)", nullable: true),
                    TotalInvested = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    TotalMarketValue = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    TotalReturn = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    ReturnPct = table.Column<decimal>(type: "numeric(9,4)", nullable: false),
                    ParseWarnings = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HoldingsSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Holdings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SnapshotId = table.Column<int>(type: "integer", nullable: false),
                    AssetClass = table.Column<int>(type: "integer", nullable: false),
                    RowOrder = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Isin = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: true),
                    Account = table.Column<string>(type: "text", nullable: true),
                    Category = table.Column<string>(type: "text", nullable: true),
                    Units = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    InvestedReported = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    Invested = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    MarketValue = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    TotalReturnReported = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    TotalReturn = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    Xirr = table.Column<decimal>(type: "numeric(9,4)", nullable: true),
                    PortfolioWeightReported = table.Column<decimal>(type: "numeric(9,4)", nullable: true),
                    IsAggregate = table.Column<bool>(type: "boolean", nullable: false),
                    ExcludedFromTotals = table.Column<bool>(type: "boolean", nullable: false),
                    GroupKey = table.Column<string>(type: "text", nullable: false),
                    CostBasisAdjusted = table.Column<bool>(type: "boolean", nullable: false),
                    AdjustmentNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Holdings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Holdings_HoldingsSnapshots_SnapshotId",
                        column: x => x.SnapshotId,
                        principalTable: "HoldingsSnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "CostBasisOverrides",
                columns: new[] { "Id", "CreatedAt", "InstrumentName", "InvestedAmount", "IsActive", "Isin", "Reason", "UpdatedAt" },
                values: new object[] { 1, new DateTime(2026, 7, 26, 0, 0, 0, 0, DateTimeKind.Utc), "Tata Capital Ltd.", 14996m, true, "INE976I01016", "IPO allotment; Value Research reports no cost basis for this holding.", new DateTime(2026, 7, 26, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.CreateIndex(
                name: "IX_CostBasisOverrides_Isin",
                table: "CostBasisOverrides",
                column: "Isin",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Holdings_Isin",
                table: "Holdings",
                column: "Isin");

            migrationBuilder.CreateIndex(
                name: "IX_Holdings_SnapshotId",
                table: "Holdings",
                column: "SnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_HoldingsSnapshots_FileHash",
                table: "HoldingsSnapshots",
                column: "FileHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HoldingsSnapshots_StatementDate",
                table: "HoldingsSnapshots",
                column: "StatementDate",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CostBasisOverrides");

            migrationBuilder.DropTable(
                name: "Holdings");

            migrationBuilder.DropTable(
                name: "HoldingsSnapshots");

            migrationBuilder.Sql("ALTER TABLE \"Transactions\" DROP COLUMN IF EXISTS \"ClosingBalance\";");
            migrationBuilder.Sql("ALTER TABLE \"Transactions\" DROP COLUMN IF EXISTS \"Skipped\";");
        }
    }
}
