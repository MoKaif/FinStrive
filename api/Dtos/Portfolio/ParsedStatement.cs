using System;
using System.Collections.Generic;
using api.Models;

namespace api.Dtos.Portfolio
{
    /// <summary>
    /// Totals printed on a section's "... Total" row. Retained so the importer can
    /// prove its own arithmetic against what the statement claims.
    /// </summary>
    public class SectionTotals
    {
        public decimal? Invested { get; set; }
        public decimal? MarketValue { get; set; }
        public decimal? TotalReturn { get; set; }
        public decimal? PortfolioWeight { get; set; }
    }

    /// <summary>
    /// Raw extraction of a holdings statement, before duplicate folio rollups are
    /// resolved and before cost-basis overrides are applied.
    /// </summary>
    public class ParsedStatement
    {
        public DateTime StatementDate { get; set; }
        public string? InvestorName { get; set; }

        public decimal? ReportedInvested { get; set; }
        public decimal? ReportedMarketValue { get; set; }
        public decimal? ReportedTotalReturn { get; set; }
        public decimal? ReportedReturnPct { get; set; }

        public List<Holding> Holdings { get; set; } = new();

        public Dictionary<AssetClass, SectionTotals> SectionTotals { get; set; } = new();

        public List<string> Warnings { get; set; } = new();
    }
}
