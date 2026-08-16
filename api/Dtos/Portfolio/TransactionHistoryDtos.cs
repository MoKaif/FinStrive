using System;
using System.Collections.Generic;

namespace api.Dtos.Portfolio
{
    /// <summary>A month on the portfolio timeline.</summary>
    public class PortfolioTimelinePoint
    {
        public DateTime Date { get; set; }

        /// <summary>Cumulative cost. Exact; reconciles with the statement's invested total.</summary>
        public decimal InvestedCost { get; set; }

        /// <summary>Carry-forward reconstruction. See <see cref="PortfolioTimeline.ValueIsEstimated"/>.</summary>
        public decimal EstimatedValue { get; set; }

        /// <summary>Cost added during this month.</summary>
        public decimal Contributed { get; set; }

        public decimal DividendsReceived { get; set; }
        public int TransactionCount { get; set; }

        /// <summary>Positions carrying a valuation, against those held. Unequal means the value is partial.</summary>
        public int ValuedPositions { get; set; }
        public int OpenPositions { get; set; }
    }

    public class PortfolioTimeline
    {
        public List<PortfolioTimelinePoint> Points { get; set; } = new();

        public DateTime? FirstTxnDate { get; set; }
        public DateTime? LastTxnDate { get; set; }

        public decimal TotalInvested { get; set; }
        public decimal TotalDividends { get; set; }

        /// <summary>
        /// Always true, and stated in the payload so a client cannot present the value
        /// line as though it were a valuation. Only holdings statements are that.
        /// </summary>
        public bool ValueIsEstimated => true;
    }

    public class InvestmentTransactionDto
    {
        public int Id { get; set; }
        public DateTime TxnDate { get; set; }
        public string AssetClass { get; set; } = string.Empty;
        public string InstrumentName { get; set; } = string.Empty;
        public string? Isin { get; set; }
        public string? Account { get; set; }
        public string TransactionType { get; set; } = string.Empty;
        public string Kind { get; set; } = string.Empty;
        public decimal? Amount { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? BalanceQuantity { get; set; }
        public decimal? MarketValue { get; set; }
        public decimal? BalanceAmount { get; set; }
    }

    public class TransactionHistorySummary
    {
        public int Id { get; set; }
        public DateTime StatementDate { get; set; }
        public string? Period { get; set; }
        public string? InvestorName { get; set; }
        public string SourceFileName { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
        public int TransactionCount { get; set; }
        public DateTime? FirstTxnDate { get; set; }
        public DateTime? LastTxnDate { get; set; }
        public decimal TotalInvested { get; set; }
        public decimal TotalDividends { get; set; }
        public List<string> Warnings { get; set; } = new();
    }

    public class TransactionHistoryDetail : TransactionHistorySummary
    {
        public List<InvestmentTransactionDto> Transactions { get; set; } = new();
    }

    public class TransactionHistoryImportResult
    {
        public string Outcome { get; set; } = string.Empty;
        public TransactionHistorySummary Import { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }
}
