using System;
using System.Collections.Generic;

namespace api.Models
{
    /// <summary>
    /// One uploaded transaction-history workbook.
    ///
    /// The export is cumulative — every upload restates the whole history — so
    /// reads serve the most recent import rather than merging them. Older ones are
    /// kept only so a figure can be traced to the file it came from.
    /// </summary>
    public class TransactionHistoryImport
    {
        public int Id { get; set; }

        /// <summary>The "as on" date printed on the export, not the upload date.</summary>
        public DateTime StatementDate { get; set; }

        /// <summary>The export's own period label, e.g. "All-time".</summary>
        public string? Period { get; set; }

        public string? InvestorName { get; set; }

        public string SourceFileName { get; set; } = string.Empty;
        public string? StoredFileName { get; set; }

        /// <summary>SHA-256 of the bytes; blocks importing the same file twice.</summary>
        public string FileHash { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        public int TransactionCount { get; set; }

        /// <summary>Earliest and latest transaction in the file.</summary>
        public DateTime? FirstTxnDate { get; set; }
        public DateTime? LastTxnDate { get; set; }

        /// <summary>Sum of positive investment amounts; reconciles with the statement's invested total.</summary>
        public decimal TotalInvested { get; set; }

        /// <summary>Payouts received, as a positive figure.</summary>
        public decimal TotalDividends { get; set; }

        /// <summary>Newline-separated notes raised while parsing.</summary>
        public string? ParseWarnings { get; set; }

        public List<InvestmentTransaction> Transactions { get; set; } = new();
    }
}
