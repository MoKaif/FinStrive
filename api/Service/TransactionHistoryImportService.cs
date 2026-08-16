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
    /// Stores an uploaded transaction-history workbook.
    ///
    /// The export restates the entire history every time, so imports supersede one
    /// another rather than accumulating: uploading a newer file for the same export
    /// date replaces it, and reads always serve the most recent import. Older ones
    /// stay on disk and in the table so a figure can be traced to its source.
    /// </summary>
    public class TransactionHistoryImportService : ITransactionHistoryImportService
    {
        private readonly FinanceDbContext _db;
        private readonly ITransactionHistoryParser _parser;
        private readonly string _archivePath;

        public TransactionHistoryImportService(
            FinanceDbContext db,
            ITransactionHistoryParser parser,
            IWebHostEnvironment env)
        {
            _db = db;
            _parser = parser;
            _archivePath = Path.Combine(env.ContentRootPath, "PortfolioFiles");
        }

        public async Task<TransactionHistoryResult> ImportAsync(
            Stream stream,
            string fileName,
            bool replaceExisting,
            CancellationToken cancellationToken = default)
        {
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, cancellationToken);
            var bytes = buffer.ToArray();
            var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

            var alreadyImported = await _db.TransactionHistoryImports
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.FileHash == hash, cancellationToken);

            if (alreadyImported != null)
            {
                return new TransactionHistoryResult
                {
                    Outcome = TransactionHistoryOutcome.DuplicateFile,
                    Import = alreadyImported,
                    Message = $"This exact file was already imported on " +
                              $"{alreadyImported.UploadedAt:dd MMM yyyy}, covering " +
                              $"{alreadyImported.TransactionCount} transactions."
                };
            }

            buffer.Position = 0;
            var parsed = _parser.Parse(buffer);
            var warnings = new List<string>(parsed.Warnings);

            var transactions = parsed.Transactions;
            var invested = transactions.Sum(t => t.CostContribution);
            var dividends = transactions
                .Where(t => t.Kind == InvestmentTransactionKind.Dividend && t.Amount is < 0)
                .Sum(t => -t.Amount!.Value);

            var import = new TransactionHistoryImport
            {
                StatementDate = parsed.StatementDate,
                Period = parsed.Period,
                InvestorName = parsed.InvestorName,
                SourceFileName = fileName,
                StoredFileName = await ArchiveAsync(bytes, parsed.StatementDate, fileName, cancellationToken),
                FileHash = hash,
                UploadedAt = DateTime.UtcNow,
                TransactionCount = transactions.Count,
                FirstTxnDate = transactions.Min(t => t.TxnDate),
                LastTxnDate = transactions.Max(t => t.TxnDate),
                TotalInvested = invested,
                TotalDividends = dividends,
                Transactions = transactions,
                ParseWarnings = warnings.Count > 0 ? string.Join("\n", warnings) : null
            };

            // A second export taken on the same day says the same thing; keeping both
            // would leave two candidates for "the latest import" with no way to choose.
            var existingForDate = await _db.TransactionHistoryImports
                .FirstOrDefaultAsync(i => i.StatementDate == parsed.StatementDate, cancellationToken);

            var replaced = existingForDate != null;

            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

            if (existingForDate != null)
            {
                _db.TransactionHistoryImports.Remove(existingForDate);
                await _db.SaveChangesAsync(cancellationToken);
            }

            _db.TransactionHistoryImports.Add(import);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new TransactionHistoryResult
            {
                Outcome = replaced ? TransactionHistoryOutcome.Replaced : TransactionHistoryOutcome.Imported,
                Import = import,
                Warnings = warnings
            };
        }

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
                var stored = $"history_{statementDate:yyyy-MM-dd}_{DateTime.UtcNow:HHmmss}_{safeName}";
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
