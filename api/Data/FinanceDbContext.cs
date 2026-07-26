using System;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data
{
    public class FinanceDbContext : DbContext
    {
        // Money in holdings statements carries up to six decimals (the Total Return
        // column in particular), so amounts are stored losslessly rather than at 2dp.
        private const string Money = "numeric(18,6)";
        private const string Pct = "numeric(9,4)";

        public FinanceDbContext(DbContextOptions<FinanceDbContext> options) : base(options)
        {
        }

        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<HoldingsSnapshot> HoldingsSnapshots { get; set; } = null!;
        public DbSet<Holding> Holdings { get; set; } = null!;
        public DbSet<CostBasisOverride> CostBasisOverrides { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.ToTable("Transactions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TxnDate).IsRequired();
                entity.Property(e => e.DescriptionRaw).IsRequired();
                entity.Property(e => e.Amount).HasColumnType("numeric(18,2)").IsRequired();
                entity.Property(e => e.Source).IsRequired();

                // Add unique index on SourceRef for PDF transactions to prevent duplicates
                entity.HasIndex(e => new { e.Source, e.SourceRef })
                    .IsUnique()
                    .HasFilter("\"Source\" = 'pdf' AND \"SourceRef\" IS NOT NULL");
            });

            modelBuilder.Entity<HoldingsSnapshot>(entity =>
            {
                entity.ToTable("HoldingsSnapshots");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StatementDate).IsRequired();
                entity.Property(e => e.SourceFileName).IsRequired();
                entity.Property(e => e.FileHash).IsRequired().HasMaxLength(64);

                entity.Property(e => e.ReportedInvested).HasColumnType(Money);
                entity.Property(e => e.ReportedMarketValue).HasColumnType(Money);
                entity.Property(e => e.ReportedTotalReturn).HasColumnType(Money);
                entity.Property(e => e.ReportedReturnPct).HasColumnType(Pct);
                entity.Property(e => e.TotalInvested).HasColumnType(Money);
                entity.Property(e => e.TotalMarketValue).HasColumnType(Money);
                entity.Property(e => e.TotalReturn).HasColumnType(Money);
                entity.Property(e => e.ReturnPct).HasColumnType(Pct);

                // Re-uploading the identical file is a no-op rather than a duplicate.
                entity.HasIndex(e => e.FileHash).IsUnique();
                // One snapshot per statement date; a re-import for the same date replaces it.
                entity.HasIndex(e => e.StatementDate).IsUnique();
            });

            modelBuilder.Entity<Holding>(entity =>
            {
                entity.ToTable("Holdings");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.Isin).HasMaxLength(12);
                entity.Property(e => e.GroupKey).IsRequired();

                entity.Property(e => e.Units).HasColumnType(Money);
                entity.Property(e => e.UnitPrice).HasColumnType(Money);
                entity.Property(e => e.InvestedReported).HasColumnType(Money);
                entity.Property(e => e.Invested).HasColumnType(Money);
                entity.Property(e => e.MarketValue).HasColumnType(Money);
                entity.Property(e => e.TotalReturnReported).HasColumnType(Money);
                entity.Property(e => e.TotalReturn).HasColumnType(Money);
                entity.Property(e => e.Xirr).HasColumnType(Pct);
                entity.Property(e => e.PortfolioWeightReported).HasColumnType(Pct);

                entity.Ignore(e => e.IsEtf);

                entity.HasOne(e => e.Snapshot)
                    .WithMany(s => s.Holdings)
                    .HasForeignKey(e => e.SnapshotId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.SnapshotId);
                // Drives the per-instrument history view.
                entity.HasIndex(e => e.Isin);
            });

            modelBuilder.Entity<CostBasisOverride>(entity =>
            {
                entity.ToTable("CostBasisOverrides");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Isin).IsRequired().HasMaxLength(12);
                entity.Property(e => e.InvestedAmount).HasColumnType(Money).IsRequired();
                entity.HasIndex(e => e.Isin).IsUnique();

                // Value Research reports Tata Capital at a zero cost basis because the
                // IPO allotment never appeared as a buy transaction, which books the
                // entire market value as profit. The real subscription was Rs 14,996.
                entity.HasData(new CostBasisOverride
                {
                    Id = 1,
                    Isin = "INE976I01016",
                    InstrumentName = "Tata Capital Ltd.",
                    InvestedAmount = 14996m,
                    Reason = "IPO allotment; Value Research reports no cost basis for this holding.",
                    IsActive = true,
                    CreatedAt = new DateTime(2026, 7, 26, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 7, 26, 0, 0, 0, DateTimeKind.Utc)
                });
            });
        }
    }
}
