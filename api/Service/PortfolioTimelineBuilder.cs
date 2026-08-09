using System;
using System.Collections.Generic;
using System.Linq;
using api.Dtos.Portfolio;
using api.Models;

namespace api.Service
{
    /// <summary>
    /// Turns a transaction history into a month-by-month view of the portfolio.
    ///
    /// Two figures with very different standing come out of this, and the split
    /// matters:
    ///
    /// <para>Invested cost is <em>exact</em>. It is the sum of what was actually paid,
    /// and it reconciles to the paisa with the "Invested Amount" printed on the
    /// holdings statement.</para>
    ///
    /// <para>Market value is an <em>estimate</em>. The export values a position only on
    /// the days it was traded, so between transactions the last known valuation is
    /// carried forward. A month in which nothing was bought reports last month's
    /// prices. Holdings statements are the authority on value; this line exists to
    /// give the shape of the years before the first statement was imported.</para>
    /// </summary>
    public static class PortfolioTimelineBuilder
    {
        /// <summary>Identifies one tradeable position: an instrument held in one folio.</summary>
        private readonly record struct PositionKey(AssetClass AssetClass, string GroupKey, string Account);

        public static PortfolioTimeline Build(
            IReadOnlyCollection<InvestmentTransaction> transactions,
            IReadOnlyCollection<CostBasisOverride>? overrides = null)
        {
            var timeline = new PortfolioTimeline();
            if (transactions.Count == 0) return timeline;

            var ordered = transactions
                .OrderBy(t => t.TxnDate)
                .ThenBy(t => t.RowOrder)
                .ToList();

            var adjustments = CostAdjustments(ordered, overrides);

            var cost = new Dictionary<PositionKey, decimal>();
            var value = new Dictionary<PositionKey, decimal>();

            var first = ordered[0].TxnDate;
            var last = ordered[^1].TxnDate;

            var cursor = 0;
            var monthlyContribution = 0m;
            var monthlyDividends = 0m;
            var monthlyCount = 0;

            for (var month = MonthStart(first); month <= MonthStart(last); month = month.AddMonths(1))
            {
                var monthEnd = month.AddMonths(1).AddDays(-1);

                while (cursor < ordered.Count && ordered[cursor].TxnDate <= monthEnd)
                {
                    var txn = ordered[cursor++];
                    var key = new PositionKey(txn.AssetClass, txn.GroupKey, txn.Account ?? string.Empty);

                    var contribution = txn.CostContribution;
                    if (adjustments.TryGetValue(txn, out var adjustment))
                        contribution += adjustment;

                    if (contribution != 0m)
                    {
                        cost[key] = cost.GetValueOrDefault(key) + contribution;
                        monthlyContribution += contribution;
                    }

                    if (txn.Kind == InvestmentTransactionKind.Dividend && txn.Amount is < 0)
                        monthlyDividends += -txn.Amount.Value;

                    // PPF reports a running balance rather than a market value; for a
                    // deposit account the balance is the value.
                    var valuation = txn.MarketValue ?? txn.BalanceAmount;
                    if (valuation.HasValue) value[key] = valuation.Value;

                    monthlyCount++;
                }

                timeline.Points.Add(new PortfolioTimelinePoint
                {
                    Date = monthEnd > last ? last : monthEnd,
                    InvestedCost = cost.Values.Sum(),
                    EstimatedValue = value.Values.Sum(),
                    Contributed = monthlyContribution,
                    DividendsReceived = monthlyDividends,
                    TransactionCount = monthlyCount,
                    ValuedPositions = value.Count,
                    OpenPositions = cost.Count
                });

                monthlyContribution = 0m;
                monthlyDividends = 0m;
                monthlyCount = 0;
            }

            timeline.FirstTxnDate = first;
            timeline.LastTxnDate = last;
            timeline.TotalInvested = cost.Values.Sum();
            timeline.TotalDividends = ordered
                .Where(t => t.Kind == InvestmentTransactionKind.Dividend && t.Amount is < 0)
                .Sum(t => -t.Amount!.Value);

            return timeline;
        }

        /// <summary>
        /// Works out where a standing cost correction lands on the timeline.
        ///
        /// An override states what an instrument really cost. The statement reports
        /// nothing for an IPO allotment, so without this the timeline would show units
        /// appearing for free. The correction is attributed to the instrument's first
        /// transaction, which is when the money actually left, and is applied per
        /// instrument rather than per folio so a holding split across folios is not
        /// corrected twice.
        /// </summary>
        private static Dictionary<InvestmentTransaction, decimal> CostAdjustments(
            IReadOnlyList<InvestmentTransaction> ordered,
            IReadOnlyCollection<CostBasisOverride>? overrides)
        {
            // Keyed by the transaction itself: reference identity, so this works
            // whether or not the rows have been assigned database ids yet.
            var adjustments = new Dictionary<InvestmentTransaction, decimal>();
            if (overrides == null || overrides.Count == 0) return adjustments;

            var active = overrides
                .Where(o => o.IsActive && !string.IsNullOrWhiteSpace(o.Isin))
                .ToDictionary(o => o.Isin.Trim().ToUpperInvariant(), o => o.InvestedAmount);

            if (active.Count == 0) return adjustments;

            var instruments = ordered
                .Where(t => t.Isin != null)
                .GroupBy(t => (t.AssetClass, Isin: t.Isin!.ToUpperInvariant()));

            foreach (var instrument in instruments)
            {
                if (!active.TryGetValue(instrument.Key.Isin, out var corrected)) continue;

                var reported = instrument.Sum(t => t.CostContribution);
                var delta = corrected - reported;
                if (delta == 0m) continue;

                var anchor = instrument.OrderBy(t => t.TxnDate).ThenBy(t => t.RowOrder).First();
                adjustments[anchor] = delta;
            }

            return adjustments;
        }

        private static DateTime MonthStart(DateTime date) =>
            new(date.Year, date.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }
}
