using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using api.Data;
using api.Dtos.Portfolio;
using api.Interfaces;
using api.Mappers;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers
{
    /// <summary>
    /// Monthly Value Research holdings statements: import, history, and the
    /// standing cost-basis corrections applied to every import.
    /// </summary>
    [Route("api/holdings")]
    [ApiController]
    [Authorize]
    public class HoldingsController : ControllerBase
    {
        private static readonly string[] AllowedExtensions = { ".xls", ".xlsx" };
        private const long MaxUploadBytes = 10 * 1024 * 1024;

        private readonly FinanceDbContext _db;
        private readonly IHoldingsImportService _importService;
        private readonly ILogger<HoldingsController> _logger;

        public HoldingsController(
            FinanceDbContext db,
            IHoldingsImportService importService,
            ILogger<HoldingsController> logger)
        {
            _db = db;
            _importService = importService;
            _logger = logger;
        }

        /// <summary>Imports a statement. Pass replace=true to overwrite an existing one for the same date.</summary>
        [HttpPost("import")]
        [RequestSizeLimit(MaxUploadBytes)]
        public async Task<IActionResult> Import(
            IFormFile file,
            [FromQuery] bool replace = false,
            CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file was uploaded." });

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = "Expected an .xls or .xlsx holdings statement." });

            try
            {
                await using var stream = file.OpenReadStream();
                var result = await _importService.ImportAsync(
                    stream, Path.GetFileName(file.FileName), replace, cancellationToken);

                if (result.Outcome == ImportOutcome.DuplicateFile)
                    return Conflict(new { code = "duplicate-file", message = result.Message, snapshotId = result.Snapshot?.Id });

                if (result.Outcome == ImportOutcome.DateConflict)
                    return Conflict(new { code = "date-conflict", message = result.Message, snapshotId = result.Snapshot?.Id });

                var detail = await BuildDetailAsync(result.Snapshot!.Id, cancellationToken);
                return Ok(new
                {
                    outcome = result.Outcome.ToString(),
                    warnings = result.Warnings,
                    snapshot = detail
                });
            }
            catch (InvalidDataException ex)
            {
                // The file opened but did not look like a holdings statement.
                return BadRequest(new { code = "unreadable", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to import holdings statement {FileName}", file.FileName);
                return BadRequest(new { code = "import-failed", message = "The statement could not be imported." });
            }
        }

        /// <summary>Every imported statement, newest first — the portfolio's history.</summary>
        [HttpGet("snapshots")]
        public async Task<IActionResult> GetSnapshots(CancellationToken cancellationToken)
        {
            var snapshots = await _db.HoldingsSnapshots
                .AsNoTracking()
                .Include(s => s.Holdings)
                .OrderByDescending(s => s.StatementDate)
                .ToListAsync(cancellationToken);

            return Ok(snapshots.Select(s => s.ToSummary()));
        }

        [HttpGet("snapshots/latest")]
        public async Task<IActionResult> GetLatest(CancellationToken cancellationToken)
        {
            var latestId = await _db.HoldingsSnapshots
                .AsNoTracking()
                .OrderByDescending(s => s.StatementDate)
                .Select(s => (int?)s.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (latestId == null)
                return Ok(null);

            return Ok(await BuildDetailAsync(latestId.Value, cancellationToken));
        }

        [HttpGet("snapshots/{id:int}")]
        public async Task<IActionResult> GetSnapshot(int id, CancellationToken cancellationToken)
        {
            var detail = await BuildDetailAsync(id, cancellationToken);
            return detail == null ? NotFound(new { message = "No such statement." }) : Ok(detail);
        }

        [HttpDelete("snapshots/{id:int}")]
        public async Task<IActionResult> DeleteSnapshot(int id, CancellationToken cancellationToken)
        {
            var snapshot = await _db.HoldingsSnapshots.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
            if (snapshot == null) return NotFound(new { message = "No such statement." });

            _db.HoldingsSnapshots.Remove(snapshot);
            await _db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = $"Removed the {snapshot.StatementDate:dd MMM yyyy} statement." });
        }

        /// <summary>Portfolio totals across every statement, oldest first, for trend charts.</summary>
        [HttpGet("timeline")]
        public async Task<IActionResult> GetTimeline(CancellationToken cancellationToken)
        {
            var points = await _db.HoldingsSnapshots
                .AsNoTracking()
                .OrderBy(s => s.StatementDate)
                .Select(s => new
                {
                    snapshotId = s.Id,
                    statementDate = s.StatementDate,
                    invested = s.TotalInvested,
                    marketValue = s.TotalMarketValue,
                    totalReturn = s.TotalReturn,
                    returnPct = s.ReturnPct
                })
                .ToListAsync(cancellationToken);

            return Ok(points);
        }

        /// <summary>How one instrument has moved across every statement it appears in.</summary>
        [HttpGet("instruments/{isin}/history")]
        public async Task<IActionResult> GetInstrumentHistory(string isin, CancellationToken cancellationToken)
        {
            var normalized = isin.Trim().ToUpperInvariant();

            var rows = await _db.Holdings
                .AsNoTracking()
                .Include(h => h.Snapshot)
                .Where(h => h.Isin == normalized && !h.ExcludedFromTotals)
                .ToListAsync(cancellationToken);

            if (rows.Count == 0)
                return NotFound(new { message = $"No holdings found for ISIN {normalized}." });

            // An instrument can occupy several folios in one statement; the history
            // tracks the instrument as a whole, so folios are summed per date.
            var points = rows
                .GroupBy(h => new { h.SnapshotId, h.Snapshot!.StatementDate })
                .OrderBy(g => g.Key.StatementDate)
                .Select(g => new HoldingHistoryPointDto
                {
                    SnapshotId = g.Key.SnapshotId,
                    StatementDate = g.Key.StatementDate,
                    Invested = g.Sum(h => h.Invested),
                    MarketValue = g.Sum(h => h.MarketValue),
                    TotalReturn = g.Sum(h => h.TotalReturn),
                    Units = g.Sum(h => h.Units),
                    UnitPrice = g.Max(h => h.UnitPrice)
                })
                .ToList();

            var newest = rows.OrderByDescending(h => h.Snapshot!.StatementDate).First();

            return Ok(new InstrumentHistoryDto
            {
                Isin = normalized,
                Name = newest.Name,
                AssetClass = newest.AssetClass.ToString(),
                Points = points
            });
        }

        // ------------------------------------------------------ cost-basis rules

        [HttpGet("cost-basis-overrides")]
        public async Task<IActionResult> GetOverrides(CancellationToken cancellationToken)
        {
            var rules = await _db.CostBasisOverrides
                .AsNoTracking()
                .OrderBy(o => o.InstrumentName)
                .ToListAsync(cancellationToken);

            return Ok(rules.Select(r => r.ToDto()));
        }

        /// <summary>
        /// Creates or updates the correction for an ISIN, then replays it across
        /// every stored statement so history and the current view agree.
        /// </summary>
        [HttpPut("cost-basis-overrides")]
        public async Task<IActionResult> SaveOverride(
            [FromBody] SaveCostBasisOverrideDto dto,
            CancellationToken cancellationToken)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Isin))
                return BadRequest(new { message = "An ISIN is required." });

            if (dto.InvestedAmount < 0)
                return BadRequest(new { message = "The invested amount cannot be negative." });

            var isin = dto.Isin.Trim().ToUpperInvariant();
            var rule = await _db.CostBasisOverrides.FirstOrDefaultAsync(o => o.Isin == isin, cancellationToken);

            if (rule == null)
            {
                rule = new CostBasisOverride { Isin = isin, CreatedAt = DateTime.UtcNow };
                _db.CostBasisOverrides.Add(rule);
            }

            rule.InstrumentName = dto.InstrumentName;
            rule.InvestedAmount = dto.InvestedAmount;
            rule.Reason = dto.Reason;
            rule.IsActive = dto.IsActive;
            rule.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);
            var updated = await _importService.ReapplyOverridesAsync(cancellationToken);

            return Ok(new { rule = rule.ToDto(), snapshotsUpdated = updated });
        }

        [HttpDelete("cost-basis-overrides/{id:int}")]
        public async Task<IActionResult> DeleteOverride(int id, CancellationToken cancellationToken)
        {
            var rule = await _db.CostBasisOverrides.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            if (rule == null) return NotFound(new { message = "No such override." });

            _db.CostBasisOverrides.Remove(rule);
            await _db.SaveChangesAsync(cancellationToken);
            var updated = await _importService.ReapplyOverridesAsync(cancellationToken);

            return Ok(new { message = $"Removed the override for {rule.Isin}.", snapshotsUpdated = updated });
        }

        // ----------------------------------------------------------------- helpers

        private async Task<SnapshotDetailDto?> BuildDetailAsync(int id, CancellationToken cancellationToken)
        {
            var snapshot = await _db.HoldingsSnapshots
                .AsNoTracking()
                .Include(s => s.Holdings)
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

            if (snapshot == null) return null;

            var previous = await _db.HoldingsSnapshots
                .AsNoTracking()
                .Include(s => s.Holdings)
                .Where(s => s.StatementDate < snapshot.StatementDate)
                .OrderByDescending(s => s.StatementDate)
                .FirstOrDefaultAsync(cancellationToken);

            return snapshot.ToDetail(previous);
        }
    }
}
