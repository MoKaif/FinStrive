using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data
{
    public class FinanceDbContext : DbContext
    {
        public FinanceDbContext(DbContextOptions<FinanceDbContext> options) : base(options)
        {
        }

        public DbSet<Transaction> Transactions { get; set; } = null!;

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
        }
    }
}
