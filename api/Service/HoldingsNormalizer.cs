using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using api.Dtos.Portfolio;
using api.Models;

namespace api.Service
{
    /// <summary>
    /// The arithmetic that turns raw statement rows into figures worth trusting:
    /// drop double-counted folio rollups, apply standing cost corrections, and
    /// total what remains. Deliberately free of persistence so the rules can be
    /// exercised on a statement file alone.
    /// </summary>
    public static class HoldingsNormalizer
    {
        /// <summary>Rupee tolerance when checking our arithmetic against the statement's own totals.</summary>
        public const decimal Tolerance = 0.05m;

        public const string MultipleFolio = "Multiple";

        // -------------------------------------------------------------- rollups

        /// <summary>
        /// Value Research emits a folio-less summary row (folio "Multiple") for an
        /// instrument held across several folios, and then repeats each folio
        /// individually. Summing every row therefore counts those holdings twice.
        /// The summary row is kept for display but excluded from all arithmetic —
        /// unless its constituent folios are absent, in which case it is the only
        /// record of the holding and must count.
        /// </summary>
        public static void ApplyRollups(List<Holding> holdings, List<string> warnings)
        {
            foreach (var group in holdings.GroupBy(h => (h.AssetClass, h.GroupKey)))
            {
                var rows = group.ToList();
                var aggregates = rows.Where(IsAggregateRow).ToList();
                var leaves = rows.Where(h => !IsAggregateRow(h)).ToList();

                if (aggregates.Count == 0 || leaves.Count == 0) continue;

                foreach (var aggregate in aggregates)
                {
                    aggregate.IsAggregate = true;
                    aggregate.ExcludedFromTotals = true;
                }

                // The rollup should equal the sum of its folios; if it does not, the
                // statement holds something we would otherwise silently drop.
                Reconcile(rows[0].Name, "invested",
                    aggregates.Sum(a => a.InvestedReported), leaves.Sum(l => l.InvestedReported),
                    leaves.Count, warnings);

                Reconcile(rows[0].Name, "market value",
                    aggregates.Sum(a => a.MarketValue), leaves.Sum(l => l.MarketValue),
                    leaves.Count, warnings);
            }

            DropExactDuplicates(holdings, warnings);
        }

        private static void Reconcile(
            string name, string measure, decimal aggregate, decimal leaves, int folioCount, List<string> warnings)
        {
            if (Math.Abs(aggregate - leaves) <= Tolerance) return;

            warnings.Add(
                $"{name}: the \"{MultipleFolio}\" rollup row reports {Format(aggregate)} {measure} but its " +
                $"{folioCount} folios sum to {Format(leaves)}. The individual folios were used.");
        }

        private static bool IsAggregateRow(Holding holding) =>
            string.Equals(holding.Account?.Trim(), MultipleFolio, StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// Defends against the same folio being listed twice within one statement,
        /// which would otherwise inflate every total.
        /// </summary>
        private static void DropExactDuplicates(List<Holding> holdings, List<string> warnings)
        {
            var seen = new HashSet<(AssetClass, string, string?, decimal, decimal)>();

            foreach (var holding in holdings.Where(h => !h.ExcludedFromTotals).OrderBy(h => h.RowOrder))
            {
                var key = (holding.AssetClass, holding.GroupKey, holding.Account,
                    holding.InvestedReported, holding.MarketValue);

                if (seen.Add(key)) continue;

                holding.ExcludedFromTotals = true;
                warnings.Add(
                    $"{holding.Name} (folio {holding.Account}) appears more than once with identical " +
                    "figures; the repeat was excluded from totals.");
            }
        }

        // ------------------------------------------------------------ overrides

        /// <summary>
        /// Replaces the statement's invested amount for instruments with a standing
        /// correction. The statement's Total Return includes realised gains and
        /// dividends, so it is shifted by the same delta rather than recomputed as
        /// market value minus cost, which would discard those components.
        /// </summary>
        public static void ApplyOverrides(IEnumerable<Holding> holdings, IReadOnlyList<CostBasisOverride> overrides)
        {
            if (overrides.Count == 0) return;

            var byIsin = overrides
                .Where(o => !string.IsNullOrWhiteSpace(o.Isin))
                .GroupBy(o => o.Isin.Trim().ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.First());

            foreach (var holding in holdings)
            {
                if (holding.Isin == null) continue;
                if (!byIsin.TryGetValue(holding.Isin, out var rule)) continue;

                var delta = rule.InvestedAmount - holding.InvestedReported;
                holding.Invested = rule.InvestedAmount;
                holding.TotalReturn = holding.TotalReturnReported - delta;
                holding.CostBasisAdjusted = true;
            }
        }

        /// <summary>Rebuilds each row's explanation of what was changed or excluded.</summary>
        public static void DescribeAdjustments(
            IEnumerable<Holding> holdings, IReadOnlyList<CostBasisOverride> overrides)
        {
            foreach (var holding in holdings)
            {
                var parts = new List<string>();

                if (holding.IsAggregate)
                    parts.Add($"Combined \"{MultipleFolio}\" folio row; excluded from totals in favour of its individual folios.");
                else if (holding.ExcludedFromTotals)
                    parts.Add("Duplicate row; excluded from totals.");

                if (holding.CostBasisAdjusted)
                {
                    var rule = overrides.FirstOrDefault(o =>
                        string.Equals(o.Isin, holding.Isin, StringComparison.OrdinalIgnoreCase));

                    var reason = string.IsNullOrWhiteSpace(rule?.Reason) ? null : $" {rule!.Reason}";
                    parts.Add(
                        $"Invested amount corrected from {Format(holding.InvestedReported)} to " +
                        $"{Format(holding.Invested)}.{reason}");
                }

                holding.AdjustmentNote = parts.Count > 0 ? string.Join(" ", parts) : null;
            }
        }

        // --------------------------------------------------------------- totals

        public static void ComputeTotals(HoldingsSnapshot snapshot, IEnumerable<Holding> holdings)
        {
            var counted = holdings.Where(h => !h.ExcludedFromTotals).ToList();

            snapshot.TotalInvested = counted.Sum(h => h.Invested);
            snapshot.TotalMarketValue = counted.Sum(h => h.MarketValue);
            snapshot.TotalReturn = counted.Sum(h => h.TotalReturn);
            snapshot.ReturnPct = snapshot.TotalInvested == 0
                ? 0m
                : Math.Round(snapshot.TotalReturn / snapshot.TotalInvested * 100m, 4);
        }

        // ----------------------------------------------------------- validation

        /// <summary>
        /// Checks the rows we intend to count against the totals the statement
        /// prints, using pre-override figures so the comparison is like-for-like.
        /// A mismatch means the layout changed in a way the parser did not follow.
        /// </summary>
        public static void ValidateAgainstStatement(
            ParsedStatement parsed, List<Holding> holdings, List<string> warnings)
        {
            foreach (var (assetClass, totals) in parsed.SectionTotals)
            {
                var rows = holdings
                    .Where(h => h.AssetClass == assetClass && !h.ExcludedFromTotals)
                    .ToList();

                // Section totals are printed to the paisa, so they must reconcile exactly.
                Compare($"{Label(assetClass)} invested amount",
                    rows.Sum(h => h.InvestedReported), totals.Invested, Tolerance, warnings);
                Compare($"{Label(assetClass)} market value",
                    rows.Sum(h => h.MarketValue), totals.MarketValue, Tolerance, warnings);
            }

            // The headline summary is rounded to whole rupees, so it needs slack.
            var counted = holdings.Where(h => !h.ExcludedFromTotals).ToList();
            Compare("Portfolio invested amount",
                counted.Sum(h => h.InvestedReported), parsed.ReportedInvested, 1m, warnings);
            Compare("Portfolio market value",
                counted.Sum(h => h.MarketValue), parsed.ReportedMarketValue, 1m, warnings);
        }

        private static void Compare(
            string label, decimal computed, decimal? reported, decimal tolerance, List<string> warnings)
        {
            if (reported == null) return;
            if (Math.Abs(computed - reported.Value) <= tolerance) return;

            warnings.Add(
                $"{label}: the statement reports {Format(reported.Value)} but the rows sum to " +
                $"{Format(computed)} (difference {Format(computed - reported.Value)}). " +
                "The imported rows were used.");
        }

        public static string Label(AssetClass assetClass) => assetClass switch
        {
            AssetClass.MutualFund => "Mutual Funds",
            AssetClass.StockOrEtf => "Stocks & ETFs",
            AssetClass.ReitInvit => "REITs & InvITs",
            AssetClass.Ppf => "PPF",
            _ => "Other"
        };

        private static string Format(decimal value) => value.ToString("N2", CultureInfo.InvariantCulture);
    }
}
