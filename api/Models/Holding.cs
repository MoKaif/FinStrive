using System;

namespace api.Models
{
    /// <summary>
    /// A single position row from a holdings statement.
    /// </summary>
    public class Holding
    {
        public int Id { get; set; }

        public int SnapshotId { get; set; }
        public HoldingsSnapshot? Snapshot { get; set; }

        public AssetClass AssetClass { get; set; }

        /// <summary>Position of the row in the source file, so the UI can preserve statement order.</summary>
        public int RowOrder { get; set; }

        public string Name { get; set; } = string.Empty;

        /// <summary>Null for PPF, which carries no ISIN.</summary>
        public string? Isin { get; set; }

        /// <summary>Folio number, demat account, or the literal "Multiple" for rollup rows.</summary>
        public string? Account { get; set; }

        /// <summary>Scheme Category or Sub-Industry, depending on the section.</summary>
        public string? Category { get; set; }

        public decimal? Units { get; set; }

        /// <summary>NAV for funds, market price for listed instruments.</summary>
        public decimal? UnitPrice { get; set; }

        // "Reported" fields are the raw statement values; the unprefixed ones are
        // what remains after cost-basis overrides are applied.
        public decimal InvestedReported { get; set; }
        public decimal Invested { get; set; }

        public decimal MarketValue { get; set; }

        public decimal TotalReturnReported { get; set; }
        public decimal TotalReturn { get; set; }

        /// <summary>Null when the statement prints "--".</summary>
        public decimal? Xirr { get; set; }

        /// <summary>Weight as printed in the statement; recomputed weights live in the DTO.</summary>
        public decimal? PortfolioWeightReported { get; set; }

        /// <summary>
        /// True for a folio == "Multiple" rollup row whose constituent folios are
        /// also present in the file. Such rows are display-only.
        /// </summary>
        public bool IsAggregate { get; set; }

        /// <summary>
        /// True when the row must not contribute to any total, either because it is
        /// a superseded aggregate or an exact duplicate.
        /// </summary>
        public bool ExcludedFromTotals { get; set; }

        /// <summary>ISIN when available, else the normalized name. Links rollup parents to their folios.</summary>
        public string GroupKey { get; set; } = string.Empty;

        /// <summary>True when a CostBasisOverride replaced the statement's invested amount.</summary>
        public bool CostBasisAdjusted { get; set; }

        /// <summary>Human-readable explanation of any adjustment or exclusion applied to this row.</summary>
        public string? AdjustmentNote { get; set; }

        /// <summary>ETFs are ISIN-prefixed INF even though they sit in the "Stocks & ETFs" section.</summary>
        public bool IsEtf => AssetClass == AssetClass.StockOrEtf
            && Isin != null
            && Isin.StartsWith("INF", StringComparison.OrdinalIgnoreCase);
    }
}
