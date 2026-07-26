using System;
using System.Collections.Generic;

namespace api.Models
{
    /// <summary>
    /// Broad instrument grouping, mirroring the sections of a Value Research
    /// holdings statement so imported totals stay reconcilable against the file.
    /// </summary>
    public enum AssetClass
    {
        MutualFund = 0,
        StockOrEtf = 1,
        ReitInvit = 2,
        Ppf = 3,
        Other = 99
    }

    /// <summary>
    /// One imported holdings statement. A new snapshot is created per monthly
    /// upload, which is what gives the portfolio its history.
    /// </summary>
    public class HoldingsSnapshot
    {
        public int Id { get; set; }

        /// <summary>The "as on" date printed in the statement, not the upload date.</summary>
        public DateTime StatementDate { get; set; }

        public string? InvestorName { get; set; }

        public string SourceFileName { get; set; } = string.Empty;

        /// <summary>Name of the archived copy under PortfolioFiles/.</summary>
        public string? StoredFileName { get; set; }

        /// <summary>SHA-256 of the uploaded bytes; blocks importing the same file twice.</summary>
        public string FileHash { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // Totals exactly as printed in the statement header, kept so the UI can
        // show what Value Research claimed alongside what we computed.
        public decimal? ReportedInvested { get; set; }
        public decimal? ReportedMarketValue { get; set; }
        public decimal? ReportedTotalReturn { get; set; }
        public decimal? ReportedReturnPct { get; set; }

        // Totals we computed: duplicate folio rollups removed and cost-basis
        // overrides applied. These are the numbers the app treats as true.
        public decimal TotalInvested { get; set; }
        public decimal TotalMarketValue { get; set; }
        public decimal TotalReturn { get; set; }
        public decimal ReturnPct { get; set; }

        /// <summary>Newline-separated notes raised while parsing (see HoldingsStatementParser).</summary>
        public string? ParseWarnings { get; set; }

        public List<Holding> Holdings { get; set; } = new();
    }
}
