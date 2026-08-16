using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using api.Data;
using api.Dtos.Portfolio;
using api.Interfaces;
using api.Models;
using api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers
{
    /// <summary>
    /// The Value Research transaction history: the dated record of every purchase,
    /// dividend and deposit behind the holdings statement.
    ///
    /// Where <see cref="HoldingsController"/> answers "what do I hold today", this
    /// answers "how did it get there", and supplies the years of history that a
    /// month of statements cannot.
    /// </summary>
    [Route("api/holdings/history")]
    [ApiController]
    [Authorize]
    public class TransactionHistoryController : ControllerBase
    {
        private static readonly string[] AllowedExtensions = { ".xls", ".xlsx" };
        private const long MaxUploadBytes = 10 * 1024 * 1024;

        private readonly FinanceDbContext _db;
        private readonly ITransactionHistoryImportService _importService;
        private readonly ILogger<TransactionHistoryController> _logger;

        public TransactionHistoryController(
            FinanceDbContext db,
            ITransactionHistoryImportService importService,
            ILogger<TransactionHistoryController> logger)
        {
            _db = db;
            _importService = importService;
            _logger = logger;
        }

        /// <summary>Imports a transaction history export, replacing any import with the same export date.</summary>
        [HttpPost("import")]
        [RequestSizeLimit(MaxUploadBytes)]
        public async Task<IActionResult> Import(
            IFormFile file,
            CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file was uploaded." });

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = "Expected an .xls or .xlsx transaction history." });

            try
            {
                await using var stream = file.OpenReadStream();
                var result = await _importService.ImportAsync(
                    stream, Path.GetFileName(file.FileName), true, cancellationToken);

                if (result.Outcome == TransactionHistoryOutcome.DuplicateFile)
                {
                    return Conflict(new
                    {
                        code = "duplicate-file",
                        message = result.Message,
                        importId = result.Import.Id
                    });
                }

                return Ok(new TransactionHistoryImportResult
                {
                    Outcome = result.Outcome.ToString(),
                    Import = ToSummary(result.Import),
                    Warnings = result.Warnings
                });
            }
            catch (InvalidDataException ex)
            {
                return BadRequest(new { code = "unreadable", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Transaction history import failed for {File}", file.FileName);
                return StatusCode(500, new { code = "import-failed", message = "The file could not be imported." });
            }
        }

        /// <summary>The most recent import, without its transactions.</summary>
        [HttpGet("latest")]
        public async Task<IActionResult> Latest(CancellationToken cancellationToken = default)
        {
            var import = await LatestImportQuery().FirstOrDefaultAsync(cancellationToken);
            return import == null ? NoContent() : Ok(ToSummary(import));
        }

        /// <summary>Every transaction in the most recent import, newest first.</summary>
        [HttpGet("transactions")]
        public async Task<IActionResult> Transactions(
            [FromQuery] string? assetClass = null,
            [FromQuery] string? isin = null,
            CancellationToken cancellationToken = default)
        {
            var import = await LatestImportQuery().FirstOrDefaultAsync(cancellationToken);
            if (import == null) return NoContent();

            var query = _db.InvestmentTransactions
                .AsNoTracking()
                .Where(t => t.ImportId == import.Id);

            if (!string.IsNullOrWhiteSpace(isin))
            {
                var wanted = isin.Trim().ToUpperInvariant();
                query = query.Where(t => t.Isin == wanted);
            }

            if (!string.IsNullOrWhiteSpace(assetClass) &&
                Enum.TryParse<AssetClass>(assetClass, true, out var parsed))
            {
                query = query.Where(t => t.AssetClass == parsed);
            }

            var transactions = await query
                .OrderByDescending(t => t.TxnDate)
                .ThenBy(t => t.RowOrder)
                .ToListAsync(cancellationToken);

            var detail = new TransactionHistoryDetail
            {
                Id = import.Id,
                StatementDate = import.StatementDate,
                Period = import.Period,
                InvestorName = import.InvestorName,
                SourceFileName = import.SourceFileName,
                UploadedAt = import.UploadedAt,
                TransactionCount = import.TransactionCount,
                FirstTxnDate = import.FirstTxnDate,
                LastTxnDate = import.LastTxnDate,
                TotalInvested = import.TotalInvested,
                TotalDividends = import.TotalDividends,
                Warnings = SplitWarnings(import.ParseWarnings),
                Transactions = transactions.Select(ToDto).ToList()
            };

            return Ok(detail);
        }

        /// <summary>
        /// Cost and estimated value by month, over the whole history. Cost is exact;
        /// value carries the last known valuation forward between transactions.
        /// </summary>
        [HttpGet("timeline")]
        public async Task<IActionResult> Timeline(CancellationToken cancellationToken = default)
        {
            var import = await LatestImportQuery().FirstOrDefaultAsync(cancellationToken);
            if (import == null) return Ok(new PortfolioTimeline());

            var transactions = await _db.InvestmentTransactions
                .AsNoTracking()
                .Where(t => t.ImportId == import.Id)
                .ToListAsync(cancellationToken);

            var overrides = await _db.CostBasisOverrides
                .AsNoTracking()
                .Where(o => o.IsActive)
                .ToListAsync(cancellationToken);

            return Ok(PortfolioTimelineBuilder.Build(transactions, overrides));
        }

        /// <summary>Deletes an import and everything it brought in.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken = default)
        {
            var import = await _db.TransactionHistoryImports
                .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

            if (import == null) return NotFound();

            _db.TransactionHistoryImports.Remove(import);
            await _db.SaveChangesAsync(cancellationToken);
            return NoContent();
        }

        // ------------------------------------------------------------------ helpers

        private IQueryable<TransactionHistoryImport> LatestImportQuery() =>
            _db.TransactionHistoryImports
                .AsNoTracking()
                .OrderByDescending(i => i.StatementDate)
                .ThenByDescending(i => i.UploadedAt);

        private static TransactionHistorySummary ToSummary(TransactionHistoryImport import) => new()
        {
            Id = import.Id,
            StatementDate = import.StatementDate,
            Period = import.Period,
            InvestorName = import.InvestorName,
            SourceFileName = import.SourceFileName,
            UploadedAt = import.UploadedAt,
            TransactionCount = import.TransactionCount,
            FirstTxnDate = import.FirstTxnDate,
            LastTxnDate = import.LastTxnDate,
            TotalInvested = import.TotalInvested,
            TotalDividends = import.TotalDividends,
            Warnings = SplitWarnings(import.ParseWarnings)
        };

        private static InvestmentTransactionDto ToDto(InvestmentTransaction t) => new()
        {
            Id = t.Id,
            TxnDate = t.TxnDate,
            AssetClass = TransactionHistoryParser.Label(t.AssetClass),
            InstrumentName = t.InstrumentName,
            Isin = t.Isin,
            Account = t.Account,
            TransactionType = t.TransactionType,
            Kind = t.Kind.ToString(),
            Amount = t.Amount,
            Quantity = t.Quantity,
            UnitPrice = t.UnitPrice,
            BalanceQuantity = t.BalanceQuantity,
            MarketValue = t.MarketValue,
            BalanceAmount = t.BalanceAmount
        };

        private static List<string> SplitWarnings(string? warnings) =>
            string.IsNullOrWhiteSpace(warnings)
                ? new List<string>()
                : warnings.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }
}
