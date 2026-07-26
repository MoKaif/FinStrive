using System;
using System.Collections.Generic;
using System.Linq;
using api.Dtos.Portfolio;
using api.Models;
using api.Service;

namespace api.Mappers
{
    public static class HoldingsMappers
    {
        public static SnapshotSummaryDto ToSummary(this HoldingsSnapshot snapshot) => new()
        {
            Id = snapshot.Id,
            StatementDate = snapshot.StatementDate,
            UploadedAt = snapshot.UploadedAt,
            SourceFileName = snapshot.SourceFileName,
            TotalInvested = snapshot.TotalInvested,
            TotalMarketValue = snapshot.TotalMarketValue,
            TotalReturn = snapshot.TotalReturn,
            ReturnPct = snapshot.ReturnPct,
            HoldingsCount = snapshot.Holdings.Count(h => !h.ExcludedFromTotals),
            WarningsCount = SplitWarnings(snapshot.ParseWarnings).Count
        };

        /// <summary>
        /// Builds the full statement view. When <paramref name="previous"/> is supplied,
        /// every row and section also carries its movement since that statement.
        /// </summary>
        public static SnapshotDetailDto ToDetail(this HoldingsSnapshot snapshot, HoldingsSnapshot? previous)
        {
            var detail = new SnapshotDetailDto
            {
                Id = snapshot.Id,
                StatementDate = snapshot.StatementDate,
                UploadedAt = snapshot.UploadedAt,
                SourceFileName = snapshot.SourceFileName,
                InvestorName = snapshot.InvestorName,
                TotalInvested = snapshot.TotalInvested,
                TotalMarketValue = snapshot.TotalMarketValue,
                TotalReturn = snapshot.TotalReturn,
                ReturnPct = snapshot.ReturnPct,
                ReportedInvested = snapshot.ReportedInvested,
                ReportedMarketValue = snapshot.ReportedMarketValue,
                ReportedTotalReturn = snapshot.ReportedTotalReturn,
                ReportedReturnPct = snapshot.ReportedReturnPct,
                HoldingsCount = snapshot.Holdings.Count(h => !h.ExcludedFromTotals),
                Warnings = SplitWarnings(snapshot.ParseWarnings)
            };
            detail.WarningsCount = detail.Warnings.Count;

            Dictionary<string, Holding>? priorRows =
                previous == null ? null : BuildLookup(previous.Holdings);

            foreach (var group in snapshot.Holdings
                         .GroupBy(h => h.AssetClass)
                         .OrderBy(g => (int)g.Key))
            {
                var rows = group
                    .OrderBy(h => h.RowOrder)
                    .Select(h => h.ToDto(snapshot.TotalMarketValue, priorRows))
                    .ToList();

                var counted = group.Where(h => !h.ExcludedFromTotals).ToList();
                var invested = counted.Sum(h => h.Invested);
                var marketValue = counted.Sum(h => h.MarketValue);

                decimal? sectionChange = null;
                if (previous != null)
                {
                    var priorValue = previous.Holdings
                        .Where(h => h.AssetClass == group.Key && !h.ExcludedFromTotals)
                        .Sum(h => h.MarketValue);
                    sectionChange = marketValue - priorValue;
                }

                detail.Sections.Add(new SectionDto
                {
                    AssetClass = group.Key.ToString(),
                    Label = HoldingsImportService.Label(group.Key),
                    Invested = invested,
                    MarketValue = marketValue,
                    TotalReturn = counted.Sum(h => h.TotalReturn),
                    ReturnPct = invested == 0 ? null : Round(counted.Sum(h => h.TotalReturn) / invested * 100m),
                    Weight = Weight(marketValue, snapshot.TotalMarketValue),
                    ChangeMarketValue = sectionChange,
                    Holdings = rows
                });
            }

            detail.Adjustments = BuildAdjustments(snapshot.Holdings);

            if (previous != null)
            {
                detail.PreviousSnapshot = previous.ToSummary();
                detail.ChangeMarketValue = snapshot.TotalMarketValue - previous.TotalMarketValue;
                detail.ChangeInvested = snapshot.TotalInvested - previous.TotalInvested;
            }

            return detail;
        }

        public static HoldingDto ToDto(
            this Holding holding,
            decimal snapshotMarketValue,
            IReadOnlyDictionary<string, Holding>? previous)
        {
            var dto = new HoldingDto
            {
                Id = holding.Id,
                AssetClass = holding.AssetClass.ToString(),
                RowOrder = holding.RowOrder,
                Name = holding.Name,
                Isin = holding.Isin,
                Account = holding.Account,
                Category = holding.Category,
                GroupKey = holding.GroupKey,
                Units = holding.Units,
                UnitPrice = holding.UnitPrice,
                Invested = holding.Invested,
                InvestedReported = holding.InvestedReported,
                MarketValue = holding.MarketValue,
                TotalReturn = holding.TotalReturn,
                TotalReturnReported = holding.TotalReturnReported,
                ReturnPct = holding.Invested == 0 ? null : Round(holding.TotalReturn / holding.Invested * 100m),
                Xirr = holding.Xirr,
                Weight = Weight(holding.MarketValue, snapshotMarketValue),
                WeightReported = holding.PortfolioWeightReported,
                IsAggregate = holding.IsAggregate,
                ExcludedFromTotals = holding.ExcludedFromTotals,
                CostBasisAdjusted = holding.CostBasisAdjusted,
                IsEtf = holding.IsEtf,
                AdjustmentNote = holding.AdjustmentNote
            };

            if (previous == null) return dto;

            if (previous.TryGetValue(LookupKey(holding), out var before))
            {
                dto.ChangeMarketValue = holding.MarketValue - before.MarketValue;
                dto.ChangeInvested = holding.Invested - before.Invested;
                dto.ChangeUnits = holding.Units - before.Units;
            }
            else
            {
                dto.IsNew = true;
            }

            return dto;
        }

        public static CostBasisOverrideDto ToDto(this CostBasisOverride rule) => new()
        {
            Id = rule.Id,
            Isin = rule.Isin,
            InstrumentName = rule.InstrumentName,
            InvestedAmount = rule.InvestedAmount,
            Reason = rule.Reason,
            IsActive = rule.IsActive,
            UpdatedAt = rule.UpdatedAt
        };

        // ----------------------------------------------------------------- helpers

        /// <summary>
        /// Rows are matched across statements by instrument and folio, so a holding
        /// split across folios tracks each folio separately.
        /// </summary>
        private static string LookupKey(Holding holding) =>
            $"{(int)holding.AssetClass}|{holding.GroupKey}|{holding.Account?.Trim().ToUpperInvariant()}";

        private static Dictionary<string, Holding> BuildLookup(IEnumerable<Holding> holdings)
        {
            var lookup = new Dictionary<string, Holding>();
            foreach (var holding in holdings)
                lookup[LookupKey(holding)] = holding;
            return lookup;
        }

        private static List<AdjustmentDto> BuildAdjustments(IEnumerable<Holding> holdings)
        {
            var adjustments = new List<AdjustmentDto>();

            foreach (var holding in holdings.OrderBy(h => h.RowOrder))
            {
                if (holding.CostBasisAdjusted)
                {
                    adjustments.Add(new AdjustmentDto
                    {
                        Kind = "cost-basis",
                        Name = holding.Name,
                        Isin = holding.Isin,
                        Account = holding.Account,
                        From = holding.InvestedReported,
                        To = holding.Invested,
                        Note = holding.AdjustmentNote
                    });
                }

                if (holding.ExcludedFromTotals)
                {
                    adjustments.Add(new AdjustmentDto
                    {
                        Kind = holding.IsAggregate ? "folio-rollup" : "duplicate",
                        Name = holding.Name,
                        Isin = holding.Isin,
                        Account = holding.Account,
                        From = holding.MarketValue,
                        To = 0m,
                        Note = holding.AdjustmentNote
                    });
                }
            }

            return adjustments;
        }

        private static decimal Weight(decimal value, decimal total) =>
            total == 0 ? 0m : Round(value / total * 100m);

        private static decimal Round(decimal value) => Math.Round(value, 4, MidpointRounding.AwayFromZero);

        private static List<string> SplitWarnings(string? warnings) =>
            string.IsNullOrWhiteSpace(warnings)
                ? new List<string>()
                : warnings.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }
}
