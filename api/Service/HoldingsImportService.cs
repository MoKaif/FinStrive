using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using api.Data;
using api.Interfaces;
using api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace api.Service
{
    /// <summary>
    /// Turns an uploaded holdings statement into a stored snapshot. Parsing lives
    /// in <see cref="HoldingsStatementParser"/> and the arithmetic in
    /// <see cref="HoldingsNormalizer"/>; this type owns deduplication, archiving
    /// and persistence.
    /// </summary>
    public class HoldingsImportService : IHoldingsImportService
    {
        private readonly FinanceDbContext _db;
        private readonly IHoldingsStatementParser _parser;
        private readonly string _archivePath;

        public HoldingsImportService(
            FinanceDbContext db,
            IHoldingsStatementParser parser,
            IWebHostEnvironment env)
        {
            _db = db;
            _parser = parser;
            _archivePath = Path.Combine(env.ContentRootPath, "PortfolioFiles");
        }

        /// <summary>Kept for callers that label asset classes; delegates to the normalizer.</summary>
        public static string Label(AssetClass assetClass) => HoldingsNormalizer.Label(assetClass);

        public async Task<HoldingsImportResult> ImportAsync(
            Stream stream,
            string fileName,
            bool replaceExisting,
            CancellationToken cancellationToken = default)
        {
            // Buffer the upload so it can be hashed, parsed and archived independently.
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, cancellationToken);
            var bytes = buffer.ToArray();
            var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

            var alreadyImported = await _db.HoldingsSnapshots
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.FileHash == hash, cancellationToken);

            if (alreadyImported != null)
            {
                return new HoldingsImportResult
                {
                    Outcome = ImportOutcome.DuplicateFile,
                    Snapshot = alreadyImported,
                    Message = $"This exact file was already imported on " +
                              $"{alreadyImported.UploadedAt:dd MMM yyyy} as the " +
                              $"{alreadyImported.StatementDate:dd MMM yyyy} statement."
                };
            }

            buffer.Position = 0;
            var parsed = _parser.Parse(buffer);

            var existingForDate = await _db.HoldingsSnapshots
                .Include(s => s.Holdings)
                .FirstOrDefaultAsync(s => s.StatementDate == parsed.StatementDate, cancellationToken);

            if (existingForDate != null && !replaceExisting)
            {
                return new HoldingsImportResult
                {
                    Outcome = ImportOutcome.DateConflict,
                    Snapshot = existingForDate,
                    Message = $"A different file for the {parsed.StatementDate:dd MMM yyyy} statement " +
                              "is already imported. Re-upload with replace enabled to overwrite it."
                };
            }

            var overrides = await ActiveOverridesAsync(cancellationToken);
            var warnings = new List<string>(parsed.Warnings);
            var holdings = parsed.Holdings;

            HoldingsNormalizer.ApplyRollups(holdings, warnings);
            HoldingsNormalizer.ValidateAgainstStatement(parsed, holdings, warnings);
            HoldingsNormalizer.ApplyOverrides(holdings, overrides);
            HoldingsNormalizer.DescribeAdjustments(holdings, overrides);

            var snapshot = new HoldingsSnapshot
            {
                StatementDate = parsed.StatementDate,
                InvestorName = parsed.InvestorName,
                SourceFileName = fileName,
                StoredFileName = await ArchiveAsync(bytes, parsed.StatementDate, fileName, cancellationToken),
                FileHash = hash,
                UploadedAt = DateTime.UtcNow,
                ReportedInvested = parsed.ReportedInvested,
                ReportedMarketValue = parsed.ReportedMarketValue,
                ReportedTotalReturn = parsed.ReportedTotalReturn,
                ReportedReturnPct = parsed.ReportedReturnPct,
                Holdings = holdings,
                ParseWarnings = warnings.Count > 0 ? string.Join("\n", warnings) : null
            };

            HoldingsNormalizer.ComputeTotals(snapshot, holdings);

            var replaced = existingForDate != null;

            // StatementDate is unique, so the old snapshot must be gone before the
            // new one lands. Two saves inside one transaction keeps that ordering
            // explicit without depending on how EF sequences the batch.
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

            if (existingForDate != null)
            {
                _db.HoldingsSnapshots.Remove(existingForDate);
                await _db.SaveChangesAsync(cancellationToken);
            }

            _db.HoldingsSnapshots.Add(snapshot);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new HoldingsImportResult
            {
                Outcome = replaced ? ImportOutcome.Replaced : ImportOutcome.Imported,
                Snapshot = snapshot,
                Warnings = warnings
            };
        }

        public async Task<int> ReapplyOverridesAsync(CancellationToken cancellationToken = default)
        {
            var overrides = await ActiveOverridesAsync(cancellationToken);

            var snapshots = await _db.HoldingsSnapshots
                .Include(s => s.Holdings)
                .ToListAsync(cancellationToken);

            foreach (var snapshot in snapshots)
            {
                // Rollup decisions are already persisted, so only the cost-basis
                // layer is rebuilt: reset to the statement's figures, then re-apply.
                foreach (var holding in snapshot.Holdings)
                {
                    holding.Invested = holding.InvestedReported;
                    holding.TotalReturn = holding.TotalReturnReported;
                    holding.CostBasisAdjusted = false;
                }

                HoldingsNormalizer.ApplyOverrides(snapshot.Holdings, overrides);
                HoldingsNormalizer.DescribeAdjustments(snapshot.Holdings, overrides);
                HoldingsNormalizer.ComputeTotals(snapshot, snapshot.Holdings);
            }

            await _db.SaveChangesAsync(cancellationToken);
            return snapshots.Count;
        }

        private async Task<List<CostBasisOverride>> ActiveOverridesAsync(CancellationToken cancellationToken) =>
            await _db.CostBasisOverrides
                .AsNoTracking()
                .Where(o => o.IsActive)
                .ToListAsync(cancellationToken);

        private async Task<string?> ArchiveAsync(
            byte[] bytes,
            DateTime statementDate,
            string originalName,
            CancellationToken cancellationToken)
        {
            try
            {
                Directory.CreateDirectory(_archivePath);
                var safeName = Path.GetFileName(originalName);
                var stored = $"{statementDate:yyyy-MM-dd}_{DateTime.UtcNow:HHmmss}_{safeName}";
                await File.WriteAllBytesAsync(Path.Combine(_archivePath, stored), bytes, cancellationToken);
                return stored;
            }
            catch (Exception)
            {
                // Archiving is for audit only; a failure here must not lose the import.
                return null;
            }
        }
    }
}
